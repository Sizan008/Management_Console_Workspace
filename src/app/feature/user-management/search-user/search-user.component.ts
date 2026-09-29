import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonUtils, ONCLICK_EXIT } from '../../../shared/constant/button-signals.constant';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';
import { resolveStageBadge } from '../../../shared/common-components/generic-workspace/stage-badge';

@Component({
  selector: 'app-search-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-user.component.html',
  styleUrls: ['./search-user.component.scss']
})
export class SearchUserComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // Filter fields
  filterUserId     = '';
  filterName       = '';
  filterEmail      = '';
  filterDepartment = '';
  filterRole       = '';
  filterStage      = '';

  searched  = signal(false);
  allResult = signal<UserCase[]>([]);

  // Pagination
  pageSize    = signal(10);
  currentPage = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.allResult().length / this.pageSize())));
  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.allResult().slice(start, start + this.pageSize());
  });
  startRecord = computed(() => this.allResult().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  endRecord   = computed(() => Math.min(this.currentPage() * this.pageSize(), this.allResult().length));

  readonly badgeClass = (stage: string) => resolveStageBadge(stage);

  departmentOptions = ['IT', 'Finance', 'Operations', 'HR', 'Compliance', 'Credit & Recovery', 'Treasury'];
  roleOptions       = ['Admin', 'Manager', 'Officer', 'Analyst'];
  stageOptions      = ['Submitted', 'Registered', 'Mail Sent', 'Activated', 'Deactivated'];

  constructor() {
    effect(() => {
      if (ONCLICK_EXIT()) {
        ONCLICK_EXIT.set(false);
        this.router.navigate(['/feature/user-management']);
      }
    });
  }

  ngOnInit(): void {
    ButtonUtils.setPageButtons({ exit: true });
  }

  ngOnDestroy(): void {
    ButtonUtils.resetAllButtons();
  }

  onSearch(): void {
    const filtered = MOCK_USERS.filter(u =>
      (!this.filterUserId     || u.userId.toLowerCase().includes(this.filterUserId.toLowerCase())) &&
      (!this.filterName       || u.fullName.toLowerCase().includes(this.filterName.toLowerCase())) &&
      (!this.filterEmail      || u.email.toLowerCase().includes(this.filterEmail.toLowerCase())) &&
      (!this.filterDepartment || u.department === this.filterDepartment) &&
      (!this.filterRole       || u.role === this.filterRole) &&
      (!this.filterStage      || u.stage === this.filterStage)
    );
    this.allResult.set(filtered);
    this.currentPage.set(1);
    this.searched.set(true);
  }

  onReset(): void {
    this.filterUserId = this.filterName = this.filterEmail = '';
    this.filterDepartment = this.filterRole = this.filterStage = '';
    this.allResult.set([]);
    this.currentPage.set(1);
    this.searched.set(false);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  onPageSizeChange(n: number): void {
    this.pageSize.set(n);
    this.currentPage.set(1);
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const cur   = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | string)[] = [1];
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }
}
