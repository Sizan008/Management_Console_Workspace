import {Component, signal, OnInit, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import { ApprovalService } from '../../../services/approval-service';

// Raw JSON structure from your approval service
interface RawApproval {
  queueId: number;
  setId: number;
  approveLevel: number;
  approverNo: number;
  approveFlag: string;
  userId: string;
  remarks: string | null;
  actionTime: string | null;
}

type ApprovalStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'CREATED';

/** Everything the template needs to paint a status — resolved once, never per render. */
interface StatusView {
  /** CSS token class carrying the colour custom properties (see the scss). */
  token: 'is-approved' | 'is-rejected' | 'is-pending' | 'is-waiting';
  label: string;
  icon: string;
}

interface ApproverDetail {
  queueId: number;
  performedBy: string;
  initials: string;
  role: string;
  status: ApprovalStatus;
  statusView: StatusView;
  performedTime: Date | null;
  comment: string | null;
}

interface ApprovalStep {
  stepOrder: number;
  stepName: string;
  minReqSupervisor: number;
  approvedCount: number;
  status: ApprovalStatus;
  statusView: StatusView;
  historyList: ApproverDetail[];
}

const STATUS_VIEWS: Record<ApprovalStatus, StatusView> = {
  APPROVED: { token: 'is-approved', label: 'Approved',    icon: 'check_circle' },
  REJECTED: { token: 'is-rejected', label: 'Rejected',    icon: 'cancel' },
  PENDING:  { token: 'is-pending',  label: 'In Progress', icon: 'schedule' },
  CREATED:  { token: 'is-waiting',  label: 'Waiting',     icon: 'radio_button_unchecked' }
};

@Component({
  selector: 'app-view-approval-activities',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltip
  ],
  templateUrl: './view-approval-activities.component.html',
  styleUrl: './view-approval-activities.component.scss',
})
export class ViewApprovalActivitiesComponent implements OnInit{
  /** Data coming from modalComponentData */
  @Input() modalComponentData: any;
  /**  Provided automatically by <generic-modal> for closing / emitting results */
  modalParent?: { close: (result?: any) => void };

  selectedStepId = signal<number | null>(null);
  steps: ApprovalStep[] = [];
  isLoadingHistory = false;
  historyError: string | null = null;

  /** Identifies the record the chain belongs to, e.g. "Set 42 · GL Subsidiary · UPDATE". */
  contextLine = '';

  // Chain-level summary, rebuilt once per load alongside the steps.
  outcomeLabel = '';
  outcomeView: StatusView = STATUS_VIEWS['CREATED'];
  progressPercent = 0;
  approvedStepsCount = 0;
  pendingStepsCount = 0;
  waitingStepsCount = 0;
  totalApprovalsCount = 0;
  totalApproversCount = 0;

  constructor(
    private approvalService: ApprovalService
  ) {}

  ngOnInit(): void {
    this.contextLine = this.buildContextLine(this.modalComponentData);

    if (this.modalComponentData?.setId) {
      this.loadApprovalHistory(this.modalComponentData.setId);
    } else {
      this.historyError = 'No Set ID provided to load approval activities.';
    }
  }


  private loadApprovalHistory(setId: number): void {
    this.isLoadingHistory = true;
    this.historyError = null;
    this.steps = [];
    this.selectedStepId.set(null);

    this.approvalService.getApprovalQueue(setId).subscribe({
      next: (response: RawApproval[]) => {
        const payload = Array.isArray(response) ? response : [];
        this.steps = this.transformToSteps(payload);
        this.buildSummary();

        // Open the level the chain is currently sitting on.
        const activeStep = this.steps.find(s => s.status === 'PENDING' || s.status === 'CREATED');
        if (activeStep) {
          this.selectedStepId.set(activeStep.stepOrder);
        }
      },
      error: (err) => {
        console.error('Failed to load approval activities', err);
        this.historyError = 'Unable to load approval history.';
      },
      complete: () => {
        this.isLoadingHistory = false;
      }
    });
  }

  // --- Transform JSON → Step model ---
  private transformToSteps(json: RawApproval[]): ApprovalStep[] {
    const grouped = json.reduce((acc: Record<number, RawApproval[]>, item: RawApproval) => {
      (acc[item.approveLevel] ||= []).push(item);
      return acc;
    }, {});

    return Object.keys(grouped)
      .map(levelStr => Number(levelStr))
      .sort((a, b) => a - b)
      .map(level => {
        const approvers = grouped[level];
        // Floored at 1: a level reporting 0 (or null) required approvals would
        // otherwise satisfy "approved >= required" before anybody acted on it.
        const minReqSupervisor = Math.max(1, ...approvers.map((a: RawApproval) => a.approverNo ?? 1));

        const historyList: ApproverDetail[] = approvers.map((a: RawApproval) => {
          const status = this.mapFlag(a.approveFlag);
          return {
            queueId: a.queueId,
            performedBy: a.userId ?? '',
            initials: this.getInitials(a.userId),
            role: this.getRoleName(a.userId),
            status,
            statusView: STATUS_VIEWS[status],
            performedTime: a.actionTime ? new Date(a.actionTime) : null,
            comment: a.remarks
          };
        });

        const approvedCount = historyList.filter(a => a.status === 'APPROVED').length;
        const status = this.resolveStepStatus(historyList, approvedCount, minReqSupervisor);

        return {
          stepOrder: level,
          stepName: this.getStepName(level),
          minReqSupervisor,
          approvedCount,
          status,
          statusView: STATUS_VIEWS[status],
          historyList
        };
      });
  }

  private buildSummary(): void {
    this.approvedStepsCount = this.steps.filter(s => s.status === 'APPROVED').length;
    this.pendingStepsCount = this.steps.filter(s => s.status === 'PENDING').length;
    this.waitingStepsCount = this.steps.filter(s => s.status === 'CREATED').length;
    this.totalApprovalsCount = this.steps.reduce((sum, s) => sum + s.approvedCount, 0);
    this.totalApproversCount = this.steps.reduce((sum, s) => sum + s.historyList.length, 0);

    this.progressPercent = this.steps.length
      ? Math.round((this.approvedStepsCount / this.steps.length) * 100)
      : 0;

    if (this.steps.some(s => s.status === 'REJECTED')) {
      this.outcomeLabel = 'Rejected';
      this.outcomeView = STATUS_VIEWS['REJECTED'];
    } else if (this.steps.length && this.approvedStepsCount === this.steps.length) {
      this.outcomeLabel = 'Fully approved';
      this.outcomeView = STATUS_VIEWS['APPROVED'];
    } else {
      this.outcomeLabel = 'Awaiting approval';
      this.outcomeView = STATUS_VIEWS['PENDING'];
    }
  }

  // --- Helper methods ---
  private resolveStepStatus(approvers: ApproverDetail[], approvedCount: number, required: number): ApprovalStatus {
    if (approvers.some(a => a.status === 'REJECTED')) return 'REJECTED';
    if (approvers.some(a => a.status === 'PENDING')) return 'PENDING';
    if (approvedCount >= required) return 'APPROVED';
    return 'CREATED';
  }

  private buildContextLine(data: any): string {
    if (!data) return '';
    return [
      data.setId ? 'Set ' + data.setId : null,
      data.functionName,
      data.actionType,
      data.recordUserId ? 'by ' + data.recordUserId : null
    ].filter(Boolean).join(' · ');
  }

  private getInitials(userId: string | null): string {
    return (userId ?? '').trim().substring(0, 2).toUpperCase() || '--';
  }

  getStepName(level: number): string {
    return {
      1: 'Manager Review',
      2: 'General Manager Approval',
      3: 'CEO Approval'
    }[level] || `Level ${level}`;
  }

  getRoleName(userId: string | null): string {
    const id = (userId ?? '').toLowerCase();
    if (id.includes('manager')) return 'Manager';
    if (id.includes('gm')) return 'General Manager';
    if (id.includes('ceo')) return 'CEO';
    return 'Approver';
  }

  mapFlag(flag: string): ApprovalStatus {
    switch (flag) {
      case 'APPROVED': return 'APPROVED';
      case 'REJECTED': return 'REJECTED';
      case 'PENDING': return 'PENDING';
      default: return 'CREATED';
    }
  }

  toggleStep(id: number) {
    this.selectedStepId.update(cur => (cur === id ? null : id));
  }

  close() {
    this.modalParent?.close();
  }

}
