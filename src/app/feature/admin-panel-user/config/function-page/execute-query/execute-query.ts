import { Component, OnInit, OnDestroy, inject, signal, effect, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';

import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../../../../shared/common-components/input-types/input-text-area/input-text-area';
import { InputDate } from '../../../../../shared/common-components/input-types/input-date/input-date';
import { InputSelectOptionField } from '../../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { GenericButton } from '../../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import {
  GenericDataGrid,
  DataGridStateChange
} from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import {
  ButtonUtils,
  ONCLICK_RESET,
  ONCLICK_EXIT
} from '../../../../../shared/constant/button-signals.constant';

import { ExecuteQueryService } from '../../../services/execute-query.service';
import { UserService } from '../../../../../core/user/user.service';
import {
  SavedQuery,
  QueryResultRow,
  GetDataByQueryPayload
} from '../../../models/execute-query.model';

@Component({
  selector: 'app-execute-query',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputTextArea,
    InputDate,
    InputSelectOptionField,
    GenericButton,
    GenericDataGrid
  ],
  templateUrl: './execute-query.html',
  styleUrls: ['./execute-query.scss']
})
export class ExecuteQueryComponent implements OnInit, OnDestroy {

  private fb         = inject(FormBuilder);
  private svc        = inject(ExecuteQueryService);
  private toast      = inject(ToastHelperService);
  private userSvc    = inject(UserService);
  private router     = inject(Router);
  private route      = inject(ActivatedRoute);
  private cdr        = inject(ChangeDetectorRef);

  @ViewChild('executeDataReportSection')
  private executeDataReportSection?: ElementRef<HTMLElement>;

  @ViewChild('resultDataSection')
  private resultDataSection?: ElementRef<HTMLElement>;

  queryForm!: FormGroup;

  savedQueries: SavedQuery[] = [];
  savedQueriesWithSerial: Array<SavedQuery & { serial: number }> = [];
  isLoadingQueries = false;

  selectedQueryId = signal<number>(0);

  resultRows: QueryResultRow[] = [];
  resultColumnKeys: string[] = [];
  resultColumnNames: Record<string, string> = {};
  resultIdField = 'rowId';

  isLoadingResult = false;

  excelFileName = 'QueryResult';
  excelHeaders: Array<{ label: string; field: string }> = [];

  showBranchID     = signal(true);
  showTransDate    = signal(true);
  showFromDate     = signal(true);
  showToDate       = signal(true);
  showTransferType = signal(true);

  transferTypeOptions: { key: string; value: string }[] = [];

  currentBranchId = '';
  headOfficeBranchId = '';
  branchDisabled = false;

  private userSub?: Subscription;

  private static readonly BLOCKED_KEYWORDS = [
    'CREATE', 'DROP', 'ALTER', 'TRUNCATE',
    'INSERT', 'UPDATE', 'DELETE',
    'COMMIT', 'ROLLBACK',
    'RENAME', 'GRANT', 'REVOKE'
  ];

  readonly selectActionSvg = `
    <path
      d="M5 12.5 9.25 16.75 19 7"
      fill="none"
      stroke="currentColor"
      stroke-width="2.3"
      stroke-linecap="round"
      stroke-linejoin="round">
    </path>
  `;

  constructor() {
    effect(() => {
      if (ONCLICK_RESET()) {
        ONCLICK_RESET.set(false);
        this.onRefresh();
      }
    });

    effect(() => {
      if (ONCLICK_EXIT()) {
        ONCLICK_EXIT.set(false);
        this.onExit();
      }
    });
  }

  ngOnInit(): void {
    this.buildForm();

    ButtonUtils.setPageButtons({
      reset: true,
      exit: false
    });

    this.userSub = this.userSvc.user$.subscribe(user => {
      this.currentBranchId = user?.officeId ?? '';
      this.recomputeBranchDisabled();
    });

    this.svc.getAppSetting('HEAD_OFFICE_BRANCH_ID').subscribe(id => {
      this.headOfficeBranchId = id ?? '';
      this.recomputeBranchDisabled();
      this.loadAllQueries();
      this.clearFields();
    });

    this.loadTransferTypes();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    ButtonUtils.resetAllButtons();
    ONCLICK_RESET.set(false);
    ONCLICK_EXIT.set(false);
  }

  private buildForm(): void {
    this.queryForm = this.fb.group({
      queryTitle:    ['', Validators.required],
      purpose:       ['', Validators.required],
      queryText:     ['', Validators.required],
      branchID:      [''],
      transDate:     [this.todayIso()],
      fromDate:      [this.todayIso()],
      toDate:        [this.todayIso()],
      transferTypeId:['SELECT']
    });

    this.queryForm.get('queryText')?.valueChanges.subscribe(() => this.showParameter());
  }

  private loadTransferTypes(): void {
    this.svc.getTransferTypes().subscribe(list => {
      this.transferTypeOptions = [
        { key: 'SELECT', value: 'Select Transfer Type' },
        ...list.map(t => ({ key: t.serviceId, value: t.serviceName }))
      ];
    });
  }

  private recomputeBranchDisabled(): void {
    if (!this.currentBranchId || !this.headOfficeBranchId) {
      this.branchDisabled = false;
      return;
    }
    this.branchDisabled = this.currentBranchId !== this.headOfficeBranchId;
  }

  get isHeadOffice(): boolean { return !this.branchDisabled; }

  private loadAllQueries(): void {
    this.isLoadingQueries = true;
    this.svc.getAllQuery().subscribe({
      next: res => {
        this.isLoadingQueries = false;
        const all = Array.isArray(res?.Result) ? res.Result : [];
        const isBranchUser = !!this.currentBranchId
          && !!this.headOfficeBranchId
          && this.currentBranchId !== this.headOfficeBranchId;
        const filtered = isBranchUser
          ? all.filter(q => q.accessRule === 'Branch')
          : all;
        this.savedQueries = filtered;
        this.savedQueriesWithSerial = filtered.map((q, i) => ({ ...q, serial: i + 1 }));
      },
      error: () => {
        this.isLoadingQueries = false;
        this.savedQueries = [];
        this.savedQueriesWithSerial = [];
        this.toast.error('Failed to load saved queries', 'Execute Query');
      }
    });
  }

  onRefresh(): void { this.clearFields(); }

  onExit(): void { this.router.navigate(['../../'], { relativeTo: this.route }); }

  onExecute(): void {
    const txt = (this.queryForm.get('queryText')?.value ?? '').toString();
    if (!txt.trim()) {
      this.toast.error('Please select a query', 'Execute Query');
      return;
    }

    const now = new Date();
    const fromVal = this.queryForm.get('fromDate')?.value;
    const toVal   = this.queryForm.get('toDate')?.value;
    const startValue = fromVal
      ? new Date(fromVal)
      : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const endValue = toVal ? new Date(toVal) : now;
    if (startValue > endValue) {
      this.toast.error('End date cannot be smaller than start date!', 'Execute Query');
      return;
    }

    let bound = txt.replace(/;$/, '').toUpperCase();
    if (this.containsBlockedKeyword(bound)) {
      this.toast.error('This query is not allowed to execute', 'Execute Query');
      return;
    }

    bound = this.bindParameters(bound);
    if (this.hasUnboundPlaceholders(bound)) {
      this.toast.error('Please input parameter value', 'Execute Query');
      return;
    }

    this.isLoadingResult = true;
    this.resultRows = [];
    this.resultColumnKeys = [];
    this.resultColumnNames = {};
    this.excelHeaders = [];

    const payload: GetDataByQueryPayload = { QueryText: bound };
    this.svc.getDataByQuery(payload).subscribe({
      next: res => {
        this.isLoadingResult = false;
        const rows = Array.isArray(res?.Result) ? res.Result : [];
        this.resultRows = rows;
        this.buildResultColumns(rows);
        if (rows.length === 0) {
          this.toast.warning('Query returned no rows', 'Execute Query');
        } else {
          this.toast.success(`Query executed — ${rows.length} row(s)`, 'Execute Query');
        }
        this.scrollToSection(this.resultDataSection);
      },
      error: () => {
        this.isLoadingResult = false;
        this.toast.error('Failed to execute query', 'Execute Query');
      }
    });
  }

  private buildResultColumns(rows: QueryResultRow[]): void {
    if (rows.length === 0) {
      this.resultColumnKeys = [];
      this.resultColumnNames = {};
      this.excelHeaders = [];
      return;
    }
    const keys = Object.keys(rows[0]);
    this.resultColumnKeys = keys;
    this.resultColumnNames = keys.reduce<Record<string, string>>((acc, k) => {
      const label = k.toUpperCase().replace(/_/g, ' ');
      acc[k] = label;
      return acc;
    }, {});
    this.excelHeaders = keys.map(k => ({
      label: k.toUpperCase().replace(/_/g, ' '),
      field: k
    }));
    this.resultIdField = keys[0] ?? 'rowId';
  }

  onDownloadExcel(): void {
    if (this.resultRows.length === 0) {
      this.toast.error('No data to export', 'Execute Query');
      return;
    }
    try {
      const data = this.resultRows.map(row => {
        const out: Record<string, any> = {};
        for (const h of this.excelHeaders) {
          out[h.label] = row[h.field];
        }
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(data, { header: this.excelHeaders.map(h => h.label) });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
      const fname = (this.excelFileName || 'QueryResult').trim() + '.xlsx';
      XLSX.writeFile(wb, fname);
      this.toast.success(`Downloaded ${fname}`, 'Execute Query');
    } catch (e) {
      console.error('[ExecuteQuery] excel export failed', e);
      this.toast.error('Excel download failed', 'Execute Query');
    }
  }

  onSelectSavedQuery(item: SavedQuery): void {
    this.selectedQueryId.set(item.queryID);
    this.queryForm.patchValue({
      queryTitle: item.queryTitle,
      purpose:    item.purpose,
      queryText:  (item.queryText ?? '').split('  ').join(' ')
    });

    if (this.isHeadOffice) {
      this.queryForm.patchValue({ branchID: '' });
    } else {
      this.queryForm.patchValue({ branchID: this.currentBranchId });
    }

    const today = this.todayIso();
    this.queryForm.patchValue({
      transDate: today,
      fromDate:  today,
      toDate:    today
    });

    this.excelFileName = item.queryTitle || 'QueryResult';
    this.resultRows = [];
    this.resultColumnKeys = [];
    this.resultColumnNames = {};
    this.excelHeaders = [];
    this.showParameter();
    this.cdr.detectChanges();
    this.scrollToSection(this.executeDataReportSection);
  }

  showParameter(): void {
    const txt = (this.queryForm.get('queryText')?.value ?? '').toString();
    this.showTransferType.set(txt.includes('@TRANS_TYPE'));
    this.showBranchID.set(txt.includes('@BRANCH_ID'));
    this.showTransDate.set(txt.includes('@TRANS_DATE'));
    this.showFromDate.set(txt.includes('@TRANS_DT_FROM'));
    this.showToDate.set(txt.includes('@TRANS_DT_UPTO'));
  }

  onQueriesGridStateChange(state: DataGridStateChange): void {
    console.log('[ExecuteQuery] saved-queries grid state change:', state);
  }
  onResultGridStateChange(state: DataGridStateChange): void {
    console.log('[ExecuteQuery] result grid state change:', state);
  }

  selectedQueryMarkerRenderer = (cellValue: any, rowData: any): string => {
    const isSelected = Number(rowData?.queryID ?? 0) === this.selectedQueryId();
    const selectedClass = isSelected ? ' is-selected' : '';
    return `<span class="saved-query-selected-marker${selectedClass}">${String(cellValue ?? '')}</span>`;
  };

  clearFields(): void {
    const today = this.todayIso();
    this.queryForm.reset({
      queryTitle: '',
      purpose: '',
      queryText: '',
      branchID: '',
      transDate: today,
      fromDate: today,
      toDate: today,
      transferTypeId: 'SELECT'
    });
    this.selectedQueryId.set(0);
    this.resultRows = [];
    this.resultColumnKeys = [];
    this.resultColumnNames = {};
    this.excelHeaders = [];
    this.excelFileName = 'QueryResult';
    this.showParameter();
  }

  onSavedQueryDoubleClick(rowJson: string): void {
    let row: SavedQuery | null = null;
    try {
      row = JSON.parse(rowJson) as SavedQuery;
    } catch {
      row = null;
    }
    if (row?.queryID != null) this.onSelectSavedQuery(row);
  }

  private containsBlockedKeyword(text: string): boolean {
    const upper = text.toUpperCase();
    return ExecuteQueryComponent.BLOCKED_KEYWORDS.some(k => upper.includes(k));
  }

  private hasUnboundPlaceholders(text: string): boolean {
    return ['@TRANS_TYPE', '@BRANCH_ID', '@TRANS_DATE', '@TRANS_DT_FROM', '@TRANS_DT_UPTO']
      .some(p => text.includes(p));
  }

  private bindParameters(text: string): string {
    const v = this.queryForm.getRawValue() as Record<string, any>;
    let out = text;

    if (out.includes('@TRANS_TYPE') && v['transferTypeId']) {
      out = out.split('@TRANS_TYPE').join(`'${v['transferTypeId']}'`);
    }
    if (out.includes('@BRANCH_ID') && v['branchID']) {
      out = out.split('@BRANCH_ID').join(`'${v['branchID']}'`);
    }
    if (out.includes('@TRANS_DATE') && v['transDate']) {
      out = out.split('@TRANS_DATE').join(`to_date('${this.toMMDDYYYY(v['transDate'])}','MM/DD/YYYY')`);
    }
    if (out.includes('@TRANS_DT_FROM') && v['fromDate']) {
      out = out.split('@TRANS_DT_FROM').join(`to_date('${this.toMMDDYYYY(v['fromDate'])}','MM/DD/YYYY')`);
    }
    if (out.includes('@TRANS_DT_UPTO') && v['toDate']) {
      out = out.split('@TRANS_DT_UPTO').join(`to_date('${this.toMMDDYYYY(v['toDate'])}','MM/DD/YYYY')`);
    }
    return out;
  }

  private scrollToSection(section?: ElementRef<HTMLElement>): void {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        section?.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toMMDDYYYY(iso: string): string {
    if (!iso) return '';
    const [yyyy, mm, dd] = iso.split('-');
    return `${mm}/${dd}/${yyyy}`;
  }
}
