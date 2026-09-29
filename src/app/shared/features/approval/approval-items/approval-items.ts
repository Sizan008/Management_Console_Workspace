import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
//import { ApprovalStepsDialogComponent } from '../approval-steps/approval-steps-dialog.component/approval-steps-dialog.component';
import {MatTab, MatTabGroup, MatTabsModule} from '@angular/material/tabs';
import {MakerList} from '../maker-list/maker-list';
import {CheckerList} from '../checker-list/checker-list';

@Component({
  selector: 'app-approval-items',
  standalone: true,
  imports: [CommonModule,   MatTabGroup, MatTab, MatTabsModule, MakerList, CheckerList],
  templateUrl: './approval-items.html',
  styleUrl: './approval-items.scss'
})
export class ApprovalItems {
  tabIndex = signal(0);// 0 = Pending Approval (default), 1 = Maker List
  onTabChange(i: number) {
    this.tabIndex.set(i);
  }
}
