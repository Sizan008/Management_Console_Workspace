import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, catchError, finalize, map, of, switchMap } from 'rxjs';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { InputNumber } from '../../../../shared/common-components/input-types/input-number/input-number';
import { InputTextBox } from '../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { LoaderService } from '../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../shared/common-componets/action-confirmation-host';
import {
  TagNewCardCustomer,
  TagNewCardGridRow,
  NewCardTagRequest,
  NewCardUntagRequest,
  BanglaQrCardRegistrationRequest,
} from '../../models/globar-response';
import { TagNewCardApiService } from '../../services/tag-new-card-apiService';
type CardType = 'NEW_CARD' | 'BANGLA_QR';
function exactDigitLengthValidator(
  length: number,
  errorKey: string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return /^\d+$/.test(value) && value.length === length
      ? null
      : { [errorKey]: true };
  };
}
function digitRangeValidator(
  min: number,
  max: number,
  errorKey: string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return /^\d+$/.test(value) && value.length >= min && value.length <= max
      ? null
      : { [errorKey]: true };
  };
}
function expiryValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '')
      .replace(/\D/g, '')
      .trim();
    if (!value) return null;
    return /^(0[1-9]|1[0-2])\d{2}$/.test(value)
      ? null
      : { expiryMmyyInvalid: true };
  };
}
@Component({
  selector: 'app-admin-panel-tag-new-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    GenericButton,
    GenericDataGrid,
    InputNumber,
    InputTextBox,
    ExpansionPanelHeader,
    ActionConfirmationHost,
  ],
  templateUrl: './admin-panel-tag-new-card.html',
})
export class AdminPanelTagNewCardComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly tagNewCardApi = inject(TagNewCardApiService);
  private readonly loaderService = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  private routeSub: Subscription | null = null;
  userId = '';
  readonly customerPanelOpen = signal(true);
  readonly cardInformationPanelOpen = signal(true);
  readonly cardListPanelOpen = signal(true);
  readonly loading = signal(false);
  readonly activeCardType = signal<CardType>('NEW_CARD');
  readonly customer = signal<TagNewCardCustomer | null>(null);
  readonly taggedCards = signal<TagNewCardGridRow[]>([]);
  readonly cardToUntag = signal<TagNewCardGridRow | null>(null);
  readonly customerForm = this.formBuilder.nonNullable.group({
    userId: [{ value: '', disabled: true }],
    customerId: [{ value: '', disabled: true }],
    customerName: [{ value: '', disabled: true }],
  });
  readonly newCardForm = this.formBuilder.nonNullable.group({
    cardNumber: [
      '',
      [
        Validators.required,
        exactDigitLengthValidator(16, 'cardNumberLengthInvalid'),
      ],
    ],
  });
  readonly banglaQrCardForm = this.formBuilder.nonNullable.group({
    cardNumber: [
      '',
      [
        Validators.required,
        exactDigitLengthValidator(16, 'cardNumberLengthInvalid'),
      ],
    ],
    mobileNumber: [
      '',
      [
        Validators.required,
        digitRangeValidator(11, 15, 'mobileNumberLengthInvalid'),
      ],
    ],
    emailAddress: ['', [Validators.required, Validators.email]],
    expiryMmyy: ['', [Validators.required, expiryValidator()]],
  });
  readonly newCardGridColumns = ['cardNumber'];
  readonly newCardGridColumnNames: Record<string, string> = {
    cardNumber: 'Card Number',
  };
  readonly banglaQrGridColumns = [
    'cardNumber',
    'expiryMmyy',
    'mobileNumber',
    'emailAddress',
  ];
  readonly banglaQrGridColumnNames: Record<string, string> = {
    cardNumber: 'Card Number',
    expiryMmyy: 'Expiry Date',
    mobileNumber: 'Mobile Number',
    emailAddress: 'Email Address',
  };
  readonly untagActionSvg = `
<rect x="2" y="2" width="20" height="20" rx="6" fill="#DC2626"></rect>
<path d="M17.5 7.5h-5.2a1.8 1.8 0 0 0-1.3.55L6 13.05a1.8 1.8 0 0 0 0 2.55L8.4 18a1.8 1.8 0 0 0 2.55 0l5-5a1.8 1.8 0 0 0 .55-1.3V8.5a1 1 0 0 0-1-1Z" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
<circle cx="14.2" cy="10.2" r="1" fill="#FFFFFF"></circle>
<path d="m9 12.8 3.2 3.2m0-3.2L9 16" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"></path>
`;
  readonly isNewCardTab = computed(() => this.activeCardType() === 'NEW_CARD');
  readonly isBanglaQrTab = computed(
    () => this.activeCardType() === 'BANGLA_QR',
  );
  readonly activeCardEntryTitle = computed(() =>
    this.isNewCardTab()
      ? 'New Card Tag Information'
      : 'Bangla QR Card Tag Information',
  );
  readonly activeCardListTitle = computed(() =>
    this.isNewCardTab() ? 'Tagged Card List' : 'Bangla QR Card List',
  );
  readonly activeGridColumns = computed(() =>
    this.isNewCardTab() ? this.newCardGridColumns : this.banglaQrGridColumns,
  );
  readonly activeGridColumnNames = computed(() =>
    this.isNewCardTab()
      ? this.newCardGridColumnNames
      : this.banglaQrGridColumnNames,
  );
  get hasActiveFormValue(): boolean {
    const value = this.getActiveForm().getRawValue();
    return Object.values(value).some(
      (item) => String(item ?? '').trim().length > 0,
    );
  }
  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params) => {
      const userId = params['userId'];
      if (!userId) {
        this.toast.error('User ID was not found in route.', 'Error');
        return;
      }
      this.userId = String(userId);
      this.customerForm.patchValue({
        userId: this.userId,
      });
      this.loadCustomer();
    });
  }
  private loadCustomer(): void {
    this.loading.set(true);
    this.loaderService.show();
    this.tagNewCardApi
      .findUserInformation(this.userId)
      .pipe(
        switchMap((customer) => {
          this.customer.set(customer);
          this.customerForm.patchValue({
            userId: customer.userId,
            customerId: customer.customerId,
            customerName: customer.customerName,
          });
          return this.tagNewCardApi.getNewCardTaggedList(customer.userId).pipe(
            catchError((error) => {
              this.toast.warning(
                this.getErrorMessage(
                  error,
                  'Customer loaded but card list could not be loaded.',
                ),
                'Warning',
              );
              return of([]);
            }),
          );
        }),
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (cards) => {
          this.taggedCards.set(cards);
        },
        error: (error) => {
          this.customer.set(null);
          this.taggedCards.set([]);
          this.toast.error(
            this.getErrorMessage(
              error,
              'Customer information could not be loaded.',
            ),
            'Error',
          );
        },
      });
  }
  changeCardType(type: CardType): void {
    if (this.loading() || this.activeCardType() === type) {
      return;
    }
    this.activeCardType.set(type);
    this.resetForms();
    this.loadCurrentCardList();
  }
  getTabButtonStyle(type: CardType): string {
    return this.activeCardType() === type
      ? 'background: var(--theme-secondary); color: #ffffff;'
      : 'background: #e5e7eb; color: #4b5563;';
  }
  private loadCurrentCardList(): void {
    const customer = this.customer();
    if (!customer) return;
    this.loading.set(true);
    this.loaderService.show();
    const request$ = this.isNewCardTab()
      ? this.tagNewCardApi.getNewCardTaggedList(customer.userId)
      : this.tagNewCardApi.getBanglaQrRegisteredCards(customer.userId);
    request$
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (cards) => {
          this.taggedCards.set(cards);
        },
        error: (error) => {
          this.taggedCards.set([]);
          this.toast.error(
            this.getErrorMessage(error, 'Card list could not be loaded.'),
            'Error',
          );
        },
      });
  }
  async requestSave(): Promise<void> {
    if (this.loading()) return;
    const customer = this.customer();
    if (!customer) {
      this.toast.error('Customer information is missing.', 'Error');
      return;
    }
    const activeForm = this.getActiveForm();
    if (activeForm.invalid) {
      activeForm.markAllAsTouched();
      this.toast.warning(
        'Please provide all required card information.',
        'Validation',
      );
      return;
    }
    const newCard = this.isNewCardTab();
    const confirmed = await this.confirmation.confirm('save', {
      title: newCard
        ? 'Confirm New Card Tag'
        : 'Confirm Bangla QR Registration',
      message: newCard
        ? `Are you sure you want to tag this card for user "${customer.userId}"?`
        : `Are you sure you want to register this Bangla QR Card for user "${customer.userId}"?`,
      confirmText: newCard ? 'Yes, Tag Card' : 'Yes, Register',
    });
    if (!confirmed) return;
    if (newCard) {
      this.performNewCardTag();
    } else {
      this.performBanglaQrRegistration();
    }
  }
  async openUntagConfirmation(serializedRow: string): Promise<void> {
    try {
      const card = JSON.parse(serializedRow) as TagNewCardGridRow;
      if (!card?.id) {
        this.toast.error('Tagged card identifier was not found.', 'Error');
        return;
      }
      this.cardToUntag.set(card);
      const confirmed = await this.confirmation.confirm('delete', {
        title: 'Confirm Card UnTag',
        message: `Are you sure you want to untag card "${card.cardNumber}"?`,
        confirmText: 'Yes, UnTag',
      });
      if (!confirmed) {
        this.cardToUntag.set(null);
        return;
      }
      this.performUntag();
    } catch {
      this.toast.error('Unable to identify selected card.', 'Error');
    }
  }
  requestReset(): void {
    if (this.loading() || !this.hasActiveFormValue) {
      return;
    }
    this.resetActiveForm();
    this.toast.info('Card form has been reset.', 'Reset');
  }
  requestClose(): void {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  private performNewCardTag(): void {
    const customer = this.customer();
    if (!customer) return;
    const payload: NewCardTagRequest = {
      cardNo: this.getDigits(this.newCardForm.controls.cardNumber.value),
      ownerName: '',
      customerId: customer.customerId,
      reason: '',
      mobileNumber: '',
      userId: customer.userId,
      clientId: '',
      tpin: '',
      otp: '',
    };
    this.loading.set(true);
    this.loaderService.show();
    this.tagNewCardApi
      .tagNewCard(payload)
      .pipe(
        switchMap((message) =>
          this.tagNewCardApi.getNewCardTaggedList(customer.userId).pipe(
            map((cards) => ({
              message,
              cards,
            })),
            catchError((error) => {
              this.toast.warning(
                this.getErrorMessage(
                  error,
                  'Card tagged but latest list could not be loaded.',
                ),
                'Warning',
              );
              return of({
                message,
                cards: [],
              });
            }),
          ),
        ),
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (result) => {
          this.taggedCards.set(result.cards);
          this.resetActiveForm();
          this.toast.success(
            result.message || 'Card tagged successfully.',
            'Success',
          );
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Card tag request failed.'),
            'Error',
          );
        },
      });
  }
  private performBanglaQrRegistration(): void {
    const customer = this.customer();
    if (!customer) return;
    const raw = this.banglaQrCardForm.getRawValue();
    const payload: BanglaQrCardRegistrationRequest = {
      userId: customer.userId,
      fullPan: this.getDigits(raw.cardNumber),
      expireMmyy: this.normalizeMmyy(raw.expiryMmyy),
      mobileNumber: this.normalizeMobileNumber(raw.mobileNumber),
      emailAddress: raw.emailAddress.trim(),
    };
    this.loading.set(true);
    this.loaderService.show();
    this.tagNewCardApi
      .registerBanglaQrCard(payload)
      .pipe(
        switchMap((message) =>
          this.tagNewCardApi.getBanglaQrRegisteredCards(customer.userId).pipe(
            map((cards) => ({
              message,
              cards,
            })),
            catchError((error) => {
              this.toast.warning(
                this.getErrorMessage(
                  error,
                  'Card registered but latest list could not be loaded.',
                ),
                'Warning',
              );
              return of({
                message,
                cards: [],
              });
            }),
          ),
        ),
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (result) => {
          this.taggedCards.set(result.cards);
          this.resetActiveForm();
          this.toast.success(
            result.message || 'Bangla QR card registered successfully.',
            'Success',
          );
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Bangla QR card registration failed.'),
            'Error',
          );
        },
      });
  }
  private performUntag(): void {
    const customer = this.customer();
    const card = this.cardToUntag();
    if (!customer || !card) {
      this.toast.error('Customer or card information is missing.', 'Error');
      return;
    }
    const payload: NewCardUntagRequest = {
      userId: customer.userId,
      customerId: customer.customerId,
      taggedCardId: card.id,
    };
    this.loading.set(true);
    this.loaderService.show();
    this.tagNewCardApi
      .untagNewCard(payload)
      .pipe(
        switchMap((message) =>
          this.tagNewCardApi.getNewCardTaggedList(customer.userId).pipe(
            map((cards) => ({
              message,
              cards,
            })),
          ),
        ),
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (result) => {
          this.cardToUntag.set(null);
          this.taggedCards.set(result.cards);
          this.toast.success(
            result.message || 'Card untagged successfully.',
            'Success',
          );
        },
        error: (error) => {
          this.cardToUntag.set(null);
          this.toast.error(
            this.getErrorMessage(error, 'Card UnTag request failed.'),
            'Error',
          );
        },
      });
  }
  private getActiveForm(): FormGroup {
    return this.isNewCardTab() ? this.newCardForm : this.banglaQrCardForm;
  }
  private resetActiveForm(): void {
    if (this.isNewCardTab()) {
      this.newCardForm.reset({
        cardNumber: '',
      });
      this.newCardForm.markAsPristine();
      this.newCardForm.markAsUntouched();
      return;
    }
    this.banglaQrCardForm.reset({
      cardNumber: '',
      mobileNumber: '',
      emailAddress: '',
      expiryMmyy: '',
    });
    this.banglaQrCardForm.markAsPristine();
    this.banglaQrCardForm.markAsUntouched();
  }
  private resetForms(): void {
    this.newCardForm.reset({
      cardNumber: '',
    });
    this.banglaQrCardForm.reset({
      cardNumber: '',
      mobileNumber: '',
      emailAddress: '',
      expiryMmyy: '',
    });
    this.newCardForm.markAsPristine();
    this.newCardForm.markAsUntouched();
    this.banglaQrCardForm.markAsPristine();
    this.banglaQrCardForm.markAsUntouched();
  }
  private getDigits(value: unknown): string {
    return String(value ?? '')
      .replace(/\D/g, '')
      .trim();
  }
  private normalizeMobileNumber(value: unknown): string {
    const digits = this.getDigits(value);
    if (digits.length === 10 && digits.startsWith('1')) {
      return `0${digits}`;
    }
    return digits;
  }
  private normalizeMmyy(value: unknown): string {
    return this.getDigits(value).padStart(4, '0').slice(-4);
  }
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as {
        error?: {
          Message?: unknown;
          message?: unknown;
        };
      };
      const message = httpError.error?.Message ?? httpError.error?.message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
    return fallback;
  }
  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }
}
