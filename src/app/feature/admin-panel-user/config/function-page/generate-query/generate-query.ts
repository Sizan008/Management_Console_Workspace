import { Component, OnInit, OnDestroy, inject, signal, effect, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../../../../shared/common-components/input-types/input-text-area/input-text-area';
import { InputDate } from '../../../../../shared/common-components/input-types/input-date/input-date';
import { InputSelectOptionField } from '../../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
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

import { GenerateQueryService } from '../../../services/generate-query.service';
import {
  SavedQuery,
  QueryResultRow,
  SaveQueryPayload,
  GetDataByQueryPayload
} from '../../../models/generate-query.model';

@Component({
  selector: 'app-generate-query',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    InputTextBox,
    InputTextArea,
    InputDate,
    InputSelectOptionField,
    GenericDataGrid
  ],
  templateUrl: './generate-query.html',
  styleUrls: ['./generate-query.scss']
})
export class GenerateQueryComponent implements OnInit, OnDestroy {

  private fb     = inject(FormBuilder);
  private svc    = inject(GenerateQueryService);
  private toast  = inject(ToastHelperService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private cdr    = inject(ChangeDetectorRef);

  @ViewChild('generateReportSection')
  private generateReportSection?: ElementRef<HTMLElement>;

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

  showBranchID     = signal(true);
  showTransDate    = signal(true);
  showFromDate     = signal(true);
  showToDate       = signal(true);
  showTransferType = signal(true);

  transferTypeOptions: { key: string; value: string }[] = [];

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
    this.loadTransferTypes();
    this.loadAllQueries();

    ButtonUtils.setPageButtons({
      reset: true,
      exit: false
    });
  }

  ngOnDestroy(): void {
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

  private loadAllQueries(): void {
    this.isLoadingQueries = true;
    this.svc.getAllQuery().subscribe({
      next: res => {
        this.isLoadingQueries = false;
        const rows = Array.isArray(res?.Result) ? res.Result : [];
        this.savedQueries = rows;
        this.savedQueriesWithSerial = rows.map((q, i) => ({ ...q, serial: i + 1 }));
      },
      error: () => {
        this.isLoadingQueries = false;
        this.savedQueries = [];
        this.savedQueriesWithSerial = [];
        this.toast.error('Failed to load saved queries', 'Generate Query');
      }
    });
  }

  onRefresh(): void { this.clearFields(); }

  onExit(): void { this.router.navigate(['../../'], { relativeTo: this.route }); }

  onRunQuery(): void {
    this.queryForm.markAllAsTouched();
    const txt = (this.queryForm.get('queryText')?.value ?? '').toString();
    if (!txt.trim()) {
      this.toast.error('Please select a query or write a query', 'Generate Query');
      return;
    }

    const fromVal = this.queryForm.get('fromDate')?.value;
    const toVal   = this.queryForm.get('toDate')?.value;
    const fromDate = fromVal ? new Date(fromVal) : null;
    const toDate   = toVal   ? new Date(toVal)   : null;
    if (fromDate && toDate && fromDate > toDate) {
      this.toast.error('End date cannot be smaller than start date!', 'Generate Query');
      return;
    }

    let bound = txt.replace(/;$/, '').toUpperCase();
    if (this.containsBlockedKeyword(bound)) {
      this.toast.error('This query is not allowed to execute', 'Generate Query');
      return;
    }

    bound = this.bindParameters(bound);
    if (this.hasUnboundPlaceholders(bound)) {
      this.toast.error('Please input parameter value', 'Generate Query');
      return;
    }

    this.isLoadingResult = true;
    this.resultRows = [];

    const payload: GetDataByQueryPayload = { QueryText: bound };
    this.svc.getDataByQuery(payload).subscribe({
      next: res => {
        this.isLoadingResult = false;
        const rows = Array.isArray(res?.Result) ? res.Result : [];
        this.resultRows = rows;
        this.buildResultColumns(rows);
        if (rows.length === 0) {
          this.toast.warning('Query returned no rows', 'Generate Query');
        } else {
          this.toast.success(`Query executed — ${rows.length} row(s)`, 'Generate Query');
        }
        this.scrollToSection(this.resultDataSection);
      },
      error: () => {
        this.isLoadingResult = false;
        this.toast.error('Failed to execute query', 'Generate Query');
      }
    });
  }

  onSaveQuery(): void {
    const txt = (this.queryForm.get('queryText')?.value ?? '').toString();
    const upper = txt.toUpperCase();
    if (this.containsBlockedKeyword(upper)) {
      this.toast.error('This query is not allowed to save', 'Generate Query');
      return;
    }

    const v = this.queryForm.getRawValue() as {
      queryTitle: string; purpose: string; queryText: string;
    };
    const payload: SaveQueryPayload = {
      QueryID:        this.selectedQueryId(),
      QueryTitle:     v.queryTitle,
      QueryText:      v.queryText,
      Purpose:        v.purpose,
      MakeBy:         '',
      MakeDate:       '',
      LastUpdateBy:   '',
      LastUpdateDate: '',
      LastAction:     ''
    };

    this.svc.saveQuery(payload).subscribe({
      next: () => {
        this.toast.success('Query saved', 'Generate Query');
        this.loadAllQueries();
        this.clearFields();
      },
      error: () => this.toast.error('Save failed', 'Generate Query')
    });
  }

  onSelectSavedQuery(item: SavedQuery): void {
    this.selectedQueryId.set(item.queryID);
    this.queryForm.patchValue({
      queryTitle: item.queryTitle,
      purpose:    item.purpose,
      queryText:  (item.queryText ?? '').split('  ').join(' ')
    });
    const today = this.todayIso();
    this.queryForm.patchValue({
      branchID: '',
      transDate: today,
      fromDate: today,
      toDate: today
    });
    this.resultRows = [];
    this.resultColumnKeys = [];
    this.resultColumnNames = {};
    this.showParameter();
    this.cdr.detectChanges();
    this.scrollToSection(this.generateReportSection);
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
    console.log('[GenerateQuery] saved-queries grid state change:', state);
  }
  onResultGridStateChange(state: DataGridStateChange): void {
    console.log('[GenerateQuery] result grid state change:', state);
  }

  queryTextRenderer = (cellValue: any): string => {
    const text = cellValue == null ? '' : String(cellValue);
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div class="grid-text">${safe}</div>`;
  };

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
    this.resultIdField = 'rowId';
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
    return GenerateQueryComponent.BLOCKED_KEYWORDS.some(k => upper.includes(k));
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

  private buildResultColumns(rows: QueryResultRow[]): void {
    if (rows.length === 0) {
      this.resultColumnKeys = [];
      this.resultColumnNames = {};
      return;
    }
    const keys = Object.keys(rows[0]);
    this.resultColumnKeys = keys;
    this.resultColumnNames = keys.reduce<Record<string, string>>((acc, k) => {
      acc[k] = k.toUpperCase().replace(/_/g, ' ');
      return acc;
    }, {});
    this.resultIdField = keys[0] ?? 'rowId';
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
