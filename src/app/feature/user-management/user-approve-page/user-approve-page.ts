import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';

@Component({
  selector: 'app-user-approve-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-approve-page.html'
})
export class UserApprovePageComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  userData: UserCase | null = null;
  form!: FormGroup;
  submitted = false;
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({ remarks: ['', Validators.required] });
    this.routeSub = this.route.params.subscribe(p => {
      if (p['userId']) this.userData = MOCK_USERS.find(u => u.userId === p['userId']) ?? null;
    });
  }

  ngOnDestroy(): void { this.routeSub?.unsubscribe(); }

  onClose(): void { this.router.navigate(['../../'], { relativeTo: this.route }); }

  approve(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitted = true;
    console.log('Approve', this.userData?.userId, this.form.value);
  }

  reject(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitted = true;
    console.log('Reject', this.userData?.userId, this.form.value);
  }
}
