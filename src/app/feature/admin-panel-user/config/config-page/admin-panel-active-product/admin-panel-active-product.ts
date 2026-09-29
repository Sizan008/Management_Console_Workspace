import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import {
  SummaryDetailItem,
  SummaryDetailsComponent,
} from '../../../../../shared/common-components/case-quick-view/summary-details/summary-details.component';
import {
  ConfirmationDialogue,
  DeleteConfirmationModalConfig,
} from '../../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { GenericModal } from '../../../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { InputSelectOptionField } from '../../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputTextArea } from '../../../../../shared/common-components/input-types/input-text-area/input-text-area';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import {
  ButtonUtils,
  ONCLICK_RESET,
  ONCLICK_SAVE,
  ONCLICK_UPDATE,
} from '../../../../../shared/constant/button-signals.constant';
import { SidebarService } from '../../../../../layout/service/sidebar.service';
import {
  ActiveProductApiItem,
  ActiveProductReviewRow,
  ActiveProductRow,
  ActiveProductSelectOption,
  ProductPayload,
} from '../../../models/active-product.model';
import { ActiveProductService } from '../../../services/active-product.service';

import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-active-product',
  standalone: true,
  imports: [
    ExpansionPanelHeader,
    GenericButton,
    GenericDataGrid,
    GenericModal,
    InputTextBox,
    InputSelectOptionField,
    InputTextArea,
    SummaryDetailsComponent,
    ConfirmationDialogue,
  ],
  templateUrl: './admin-panel-active-product.html',
})
export class AdminPanelActiveProductComponent implements OnInit {
  private readonly api = inject(ActiveProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly sidebarService = inject(SidebarService);
  private readonly toast = inject(ToastHelperService);

  @ViewChild('productEditorSection')
  private productEditorSection?: ElementRef<HTMLElement>;

  readonly editorOpen = signal(true);
  readonly productListOpen = signal(true);
  readonly detailsInformationOpen = signal(true);
  readonly reviewsOpen = signal(true);

  readonly productTypeOptions = signal<ActiveProductSelectOption[]>([]);
  readonly productRows = signal<ActiveProductRow[]>([]);
  readonly selectedProductId = signal(0);
  readonly selectedDeleteRow = signal<ActiveProductRow | null>(null);
  readonly selectedProductDetails = signal<ActiveProductRow | null>(null);

  readonly loadingTypes = signal(false);
  readonly loadingProducts = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly pageError = signal('');
  readonly pageNotice = signal('');

  readonly saveConfirmationOpen = signal(false);
  readonly deleteConfirmationOpen = signal(false);
  readonly detailsModalOpen = signal(false);

  readonly busy = computed(
    () =>
      this.loadingTypes() ||
      this.loadingProducts() ||
      this.saving() ||
      this.deleting(),
  );
  readonly editing = computed(() => this.selectedProductId() > 0);


  readonly productForm = new FormGroup({
    productCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern('^[0-9]+$')],
    }),
    productName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    // Deliberately starts blank. A product type is never auto-selected.
    productType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    webUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern('https?://.+')],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
    details: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  readonly filterForm = new FormGroup({
    productType: new FormControl('', { nonNullable: true }),
  });

  readonly productColumns = [
    'productCode',
    'productType',
    'productName',
    'description',
    'webUrl',
    'rating',
  ];
  readonly productColumnNames: Record<string, string> = {
    productCode: 'Product Code',
    productType: 'Type Name',
    productName: 'Title',
    description: 'Description',
    webUrl: 'Web URL',
    rating: 'Rating',
  };

  readonly reviewColumns = ['userName', 'rating', 'comment'];
  readonly reviewColumnNames: Record<string, string> = {
    userName: 'User Name',
    rating: 'Rating',
    comment: 'Comment',
  };

  readonly saveConfirmationConfig: DeleteConfirmationModalConfig = {
    title: 'Save Confirmation',
    message: 'Are you sure you want to save this product?',
    variant: 'info',
    buttons: [
      { text: 'Yes, Save', action: 'confirm' },
      { text: 'Cancel', action: 'cancel' },
    ],
  };

  readonly deleteConfirmationConfig: DeleteConfirmationModalConfig = {
    title: 'Delete Confirmation',
    message: 'Are you sure you want to delete this product?',
    variant: 'warning',
    buttons: [
      { text: 'Yes, Delete', action: 'confirm' },
      { text: 'Cancel', action: 'cancel' },
    ],
  };

  readonly productDetails = computed<SummaryDetailItem[]>(() => {
    const row = this.selectedProductDetails();
    if (!row) {
      return [];
    }

    return [
      { label: 'Type Name', value: row.productType || '—' },
      { label: 'Title', value: row.productName || '—' },
      { label: 'Description', value: row.description || '—' },
      { label: 'Detail', value: row.details || '—' },
      { label: 'Product Code', value: row.productCode || '—' },
      { label: 'Rating', value: row.rating || '—' },
      { label: 'Web URL', value: row.webUrl || '—' },
      { label: 'Type ID', value: row.typeId || '—' },
    ];
  });

  readonly reviewRows = computed<ActiveProductReviewRow[]>(() => {
    const reviews = this.selectedProductDetails()?.originalData.reviewDetails;
    if (!Array.isArray(reviews)) {
      return [];
    }

    return reviews.map((review, index) => ({
      reviewKey: `${String(review.userName ?? 'review')}-${index}`,
      userName: String(review.userName ?? ''),
      rating: review.rating ?? '',
      comment: String(review.comment ?? ''),
    }));
  });

  constructor() {
    effect(() => {
      const message = this.pageError();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.pageNotice();
      if (!message) return;
      if (message.toLowerCase().includes('no products')) {
        this.toast.info(message);
      } else {
        this.toast.success(message);
      }
    });

    ButtonUtils.resetAllButtons();
    ButtonUtils.resetAllClickSignals();
    ButtonUtils.resetFormGroup();

    effect(() => {
      const editing = this.editing();
      const busy = this.busy();
      const canReset = !this.saving() && !this.deleting();

      untracked(() => {
        ButtonUtils.setPageButtons({
          save: { visible: !editing, enabled: !busy },
          update: { visible: editing, enabled: !busy },
          reset: { visible: true, enabled: canReset },
        });
      });
    });

    effect(() => {
      if (!ONCLICK_SAVE()) return;
      ONCLICK_SAVE.set(false);
      this.requestSave();
    });

    effect(() => {
      if (!ONCLICK_UPDATE()) return;
      ONCLICK_UPDATE.set(false);
      this.requestSave();
    });

    effect(() => {
      if (!ONCLICK_RESET()) return;
      ONCLICK_RESET.set(false);
      this.resetEditor();
    });

    this.destroyRef.onDestroy(() => ButtonUtils.resetAllClickSignals());
  }

  ngOnInit(): void {
    this.applyRouteTitle();
    this.loadProductTypes();
    this.loadProducts(0);

    this.filterForm.controls.productType.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.loadProducts(this.getFilterTypeId(value));
      });
  }

  loadProductTypes(): void {
    this.loadingTypes.set(true);
    this.pageError.set('');

    this.api
      .getProductTypes(0)
      .pipe(
        finalize(() => this.loadingTypes.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.isOk(response.Status)) {
            this.productTypeOptions.set([]);
            this.pageError.set(
              response.Message?.trim() || 'Unable to load product types.',
            );
            return;
          }

          const types = Array.isArray(response.Result) ? response.Result : [];
          this.productTypeOptions.set(
            types
              .map((item) => ({
                key: String(item?.TypeID ?? '').trim(),
                value: String(item?.TypeName ?? '').trim(),
              }))
              .filter((item) => !!item.key && !!item.value),
          );

          // Product rows may arrive before the type list. Re-map labels when the
          // type API completes, but never select the first type in the editor.
          this.refreshProductTypeLabels();
        },
        error: (error: unknown) => {
          this.productTypeOptions.set([]);
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load product types.'),
          );
        },
      });
  }

  loadProducts(typeId: number): void {
    this.loadingProducts.set(true);
    this.pageError.set('');
    this.pageNotice.set('');

    this.api
      .getActiveProductsList(typeId)
      .pipe(
        finalize(() => this.loadingProducts.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.isOk(response.Status)) {
            this.productRows.set([]);
            this.pageError.set(
              response.Message?.trim() || 'Unable to load active products.',
            );
            return;
          }

          const products = Array.isArray(response.Result) ? response.Result : [];
          this.productRows.set(products.map((item) => this.mapProductRow(item)));
          if (!products.length) {
            this.pageNotice.set('No products found for the selected product type.');
          }
        },
        error: (error: unknown) => {
          this.productRows.set([]);
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load active products.'),
          );
        },
      });
  }

  requestSave(): void {
    if (this.busy()) {
      return;
    }

    this.pageError.set('');
    this.pageNotice.set('');

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.pageError.set('Please fill all required product fields correctly.');
      return;
    }

    this.saveConfirmationOpen.set(true);
  }

  onSaveConfirmation(event: { action: string }): void {
    this.saveConfirmationOpen.set(false);
    if (event.action === 'confirm') {
      this.performSave();
    }
  }

  onDeleteConfirmation(event: { action: string }): void {
    this.deleteConfirmationOpen.set(false);
    if (event.action === 'confirm') {
      this.performDelete();
    } else {
      this.selectedDeleteRow.set(null);
    }
  }

  resetEditor(): void {
    if (this.saving() || this.deleting()) {
      return;
    }

    this.selectedProductId.set(0);
    this.productForm.reset({
      productCode: '',
      productName: '',
      productType: '',
      webUrl: '',
      description: '',
      details: '',
    });
    this.pageError.set('');
    this.pageNotice.set('');
  }

  onEdit(event: unknown): void {
  const row = this.parseRow(event);

  if (!row) {
    this.pageError.set('Unable to read the selected product.');
    return;
  }

  this.pageError.set('');
  this.pageNotice.set('');
  this.selectedProductId.set(row.productId);

  this.productForm.reset({
    productCode: row.productCode,
    productName: row.productName,
    productType: row.typeId > 0 ? String(row.typeId) : '',
    webUrl: row.webUrl,
    description: row.description,
    details: row.details,
  });

  this.editorOpen.set(true);

  requestAnimationFrame(() => {
    this.productEditorSection?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

  onDelete(event: unknown): void {
    const row = this.parseRow(event);
    if (!row || this.busy()) {
      if (!row) {
        this.pageError.set('Unable to read the selected product.');
      }
      return;
    }

    this.selectedDeleteRow.set(row);
    this.deleteConfirmationOpen.set(true);
  }

  onDetails(event: unknown): void {
    const row = this.parseRow(event);
    if (!row) {
      this.pageError.set('Unable to read the selected product.');
      return;
    }

    this.selectedProductDetails.set(row);
    this.detailsInformationOpen.set(true);
    this.reviewsOpen.set(true);
    this.detailsModalOpen.set(true);
  }

  closeDetails(): void {
    this.detailsModalOpen.set(false);
    this.selectedProductDetails.set(null);
  }

  private performSave(): void {
    if (this.productForm.invalid || this.saving()) {
      return;
    }

    const value = this.productForm.getRawValue();
    const productId = this.selectedProductId();
    const payload: ProductPayload = {
      Productid: productId,
      Title: value.productName.trim(),
      Shortdesc: value.description.trim(),
      Longdesc: value.details.trim(),
      Productcode: Number(value.productCode),
      Typeid: Number(value.productType),
      Weburl: value.webUrl.trim() || null,
      Remark: productId ? 'Update' : 'Add',
      changeType: productId ? 'EDT' : 'ADD',
    };

    this.saving.set(true);
    this.pageError.set('');
    this.pageNotice.set('');

    this.api
      .saveProduct(payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.isOk(response.Status)) {
            this.pageError.set(
              response.Message?.trim() || 'Product save operation failed.',
            );
            return;
          }

          const successMessage =
            response.Message?.trim() ||
            (productId
              ? 'Product updated successfully.'
              : 'Product saved successfully.');
          this.resetEditorAfterSuccess();
          this.reloadCurrentFilter();
          this.pageNotice.set(successMessage);
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'Product save operation failed.'),
          );
        },
      });
  }

  private performDelete(): void {
    const row = this.selectedDeleteRow();
    if (!row || this.deleting()) {
      return;
    }

    const payload: ProductPayload = {
      Productid: row.productId,
      Title: row.productName,
      Shortdesc: row.description,
      Longdesc: row.details,
      Productcode: Number(row.productCode),
      Typeid: row.typeId,
      Weburl: row.webUrl || null,
      Remark: 'Delete',
      changeType: 'DEL',
    };

    this.deleting.set(true);
    this.pageError.set('');
    this.pageNotice.set('');

    this.api
      .saveProduct(payload)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.isOk(response.Status)) {
            this.pageError.set(
              response.Message?.trim() || 'Product delete operation failed.',
            );
            return;
          }

          const successMessage =
            response.Message?.trim() ||
            `Product "${row.productName}" deleted successfully.`;
          this.selectedDeleteRow.set(null);
          if (this.selectedProductId() === row.productId) {
            this.resetEditorAfterSuccess();
          }
          this.reloadCurrentFilter();
          this.pageNotice.set(successMessage);
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'Product delete operation failed.'),
          );
        },
      });
  }

  private resetEditorAfterSuccess(): void {
    this.selectedProductId.set(0);
    this.productForm.reset({
      productCode: '',
      productName: '',
      productType: '',
      webUrl: '',
      description: '',
      details: '',
    });
  }

  private reloadCurrentFilter(): void {
    this.loadProducts(this.getFilterTypeId(this.filterForm.controls.productType.value));
  }

  private mapProductRow(item: ActiveProductApiItem): ActiveProductRow {
    const typeId = this.toNumber(item.typeid);
    return {
      productId: this.toNumber(item.productid),
      productName: String(item.title ?? ''),
      productCode: String(item.productcode ?? ''),
      typeId,
      productType: this.getTypeName(typeId),
      webUrl: String(item.weburl ?? ''),
      description: String(item.shortdesc ?? ''),
      details: String(item.longdesc ?? ''),
      rating: item.rating ?? '',
      originalData: item,
    };
  }

  private refreshProductTypeLabels(): void {
    this.productRows.update((rows) =>
      rows.map((row) => ({
        ...row,
        productType: this.getTypeName(row.typeId),
      })),
    );
  }

  private getTypeName(typeId: number): string {
    if (!typeId) {
      return '—';
    }
    return (
      this.productTypeOptions().find((option) => Number(option.key) === typeId)?.value ||
      String(typeId)
    );
  }

  private getFilterTypeId(value: string | null | undefined): number {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.toUpperCase() === 'ALL') {
      return 0;
    }
    return this.toNumber(normalized);
  }

  private parseRow(event: unknown): ActiveProductRow | null {
    if (event && typeof event === 'object') {
      return event as ActiveProductRow;
    }

    if (typeof event !== 'string' || !event.trim()) {
      return null;
    }

    try {
      return JSON.parse(event) as ActiveProductRow;
    } catch {
      return null;
    }
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isOk(status: unknown): boolean {
    return String(status ?? '').trim().toUpperCase() === 'OK';
  }

  private applyRouteTitle(): void {
    const title = String(this.route.snapshot.data['title'] ?? '').trim();
    if (!title) return;

    const timer = setTimeout(() => this.sidebarService.setCurrentPageName(title));
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as
        | { Message?: unknown; message?: unknown; error?: unknown }
        | string
        | null;

      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }

      if (body && typeof body === 'object') {
        for (const candidate of [body.Message, body.message, body.error]) {
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
      }

      if (error.status === 0) {
        return 'Unable to connect to the CloudNetConsole server.';
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return fallback;
  }
}
