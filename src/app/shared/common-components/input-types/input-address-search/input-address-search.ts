import { Component, forwardRef, input, output, OnDestroy, inject, computed, effect, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormGroup, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { Observable, Subject, BehaviorSubject, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter, startWith, takeUntil, map, catchError } from 'rxjs/operators';
import { AddressService } from '../../../services/address.service';
import { AddressDto } from '../../../models/address.model';
import { InputTextBox } from '../input-text-box/input-text-box';

@Component({
  selector: 'input-address-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    InputTextBox
  ],
  templateUrl: './input-address-search.html',
  styleUrls: ['./input-address-search.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputAddressSearch),
      multi: true
    }
  ]
})
export class InputAddressSearch implements ControlValueAccessor, OnDestroy {
  // Input properties matching the pattern from other components
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input<string>('Search for area, thana, post office, or district...');
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  readonly isReadonly = input<boolean>(false);
  readonly tooltip = input<string>('');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly customErrorMessages = input<{ [key: string]: string }>({});

  // Address field visibility controls
  readonly showAreaNameField = input<boolean>(true);
  readonly showThanaField = input<boolean>(true);
  readonly showPostOfficeField = input<boolean>(true);
  readonly showDistrictField = input<boolean>(true);
  readonly showPostalCodeField = input<boolean>(false);
  readonly showCountryField = input<boolean>(true);
  readonly showMouzaField = input<boolean>(true);
  readonly showManualField = input<boolean>(true);

  // Address field labels
  readonly areaNameLabel = input<string>('Area Name');
  readonly thanaLabel = input<string>('Thana');
  readonly postOfficeLabel = input<string>('Post Office');
  readonly districtLabel = input<string>('District');
  readonly postalCodeLabel = input<string>('Postal Code');
  readonly countryLabel = input<string>('Country');
  readonly mouzaLabel = input<string>('Mouza');
  readonly manualFieldLabel = input<string>('Additional Information');

  // Address field settings
  readonly makeFieldsReadonly = input<boolean>(true);
  readonly addressFieldsDisplayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');

  // Output events
  readonly addressSelected = output<AddressDto>();
  readonly searchChanged = output<string>();
  readonly valueChanged = output<AddressDto | null>();
  readonly manualInfoChanged = output<string>();

  // Services
  private addressService = inject(AddressService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // Internal form group for address fields
  addressFieldsGroup: FormGroup;

  // State management
  private selectedAddress$ = new BehaviorSubject<AddressDto | null>(null);
  filteredAddresses$: Observable<AddressDto[]>;
  isLoading$ = new BehaviorSubject<boolean>(false);
  showDropdown$ = new BehaviorSubject<boolean>(false);
  searchValue = '';
  searchResults = signal<AddressDto[]>([]);

  // ControlValueAccessor properties
  private onChange = (value: AddressDto | null) => {};
  private onTouched = () => {};

  // Computed properties
  readonly isDisabled = computed(() => this.frmGroup().get(this.controlName())?.disabled || false);
  readonly isRequired = computed(() => this.isRequiredField());
  readonly isFieldsReadonly = computed(() => this.makeFieldsReadonly());

  constructor() {
    // Initialize address fields form group
    this.addressFieldsGroup = this.fb.group({
      areaName: [''],
      thana: [''],
      postOffice: [''],
      district: [''],
      postalCode: [''],
      country: [''],
      mouza: [''],
      manualInfo: ['']
    });

    // Setup the search pipeline
    this.filteredAddresses$ = new Observable(subscriber => {
      // This will be handled by the search input changes
    });

    // Effect to handle form control changes
    effect(() => {
      const control = this.frmGroup().get(this.controlName());
      if (control) {
        control.valueChanges.pipe(
          takeUntil(this.destroy$)
        ).subscribe(value => {
          if (value !== this.selectedAddress$.value) {
            this.selectedAddress$.next(value);
            this.updateAddressFields(value);
          }
        });
      }
    });

    // Effect to set readonly state on address fields
    effect(() => {
      if (this.makeFieldsReadonly()) {
        // Disable all fields except manualInfo
        Object.keys(this.addressFieldsGroup.controls).forEach(key => {
          if (key !== 'manualInfo') {
            this.addressFieldsGroup.get(key)?.disable();
          } else {
            this.addressFieldsGroup.get(key)?.enable();
          }
        });
      } else {
        this.addressFieldsGroup.enable();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.selectedAddress$.complete();
    this.isLoading$.complete();
    this.showDropdown$.complete();
  }

  // Form validation methods
  isRequiredField(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  hasCustomMessage(errorKey: string): boolean {
    const messages = this.customErrorMessages();
    return !!messages && errorKey in messages;
  }

  getCustomErrorMessage(errorKey: string): string {
    const customMessages = this.customErrorMessages();
    const control = this.frmGroup().get(this.controlName());
    let message = `${this.label()} has validation error: ${errorKey}`;

    if (typeof customMessages[errorKey] === 'string') {
      message = customMessages[errorKey];
    } else if (control?.errors?.[errorKey]) {
      const errorValue = control.errors[errorKey];
      if (typeof errorValue === 'string') {
        message = errorValue;
      }
    }
    return message;
  }

  // Update individual address fields
  private updateAddressFields(address: AddressDto | null): void {
    if (address) {
      this.addressFieldsGroup.patchValue({
        areaName: address.villWardNm || '',
        thana: address.thanaNm || '',
        postOffice: address.unionMuniName || '',
        district: address.districtNm || '',
        postalCode: '',
        country: address.countryNm || '',
        mouza: address.mouzaNm || ''
      });
    } else {
      this.addressFieldsGroup.reset();
    }
  }

  /**
   * True when at least one visible address field actually has a value, so the
   * resolved-fields block is not rendered as an empty gap before a search.
   */
  hasResolvedAddressFields(): boolean {
    const fields: [boolean, string][] = [
      [this.showAreaNameField(), 'areaName'],
      [this.showMouzaField(), 'mouza'],
      [this.showPostOfficeField(), 'postOffice'],
      [this.showPostalCodeField(), 'postalCode'],
      [this.showThanaField(), 'thana'],
      [this.showDistrictField(), 'district'],
      [this.showCountryField(), 'country']
    ];
    return fields.some(([visible, name]) => visible && !!this.addressFieldsGroup.get(name)?.value);
  }

  // Search functionality
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value;
    this.searchValue = value;
    this.searchChanged.emit(value);

    if (!value || value.trim().length < 2) {
      this.showDropdown$.next(false);
      this.isLoading$.next(false);
      return;
    }

    this.isLoading$.next(true);
    this.showDropdown$.next(true);

    // Debounced search
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.performSearch(value.trim());
    }, 300);
  }

  private searchTimeout: any;

  private performSearch(query: string): void {
    this.addressService.searchAddress(query).pipe(
      map(response => {
        console.log('Address search response:', response);
        return response || [];
      }),
      catchError((error) => {
        console.error('Address search error:', error);
        this.isLoading$.next(false);
        return EMPTY;
      }),
      takeUntil(this.destroy$)
    ).subscribe(addresses => {
      console.log('Setting search results:', addresses);
      this.searchResults.set(addresses);
      this.isLoading$.next(false);
    });
  }

  // Event handlers
  onAddressSelected(address: AddressDto): void {
    this.selectedAddress$.next(address);
    this.searchValue = this.getDisplayValue(address);
    this.showDropdown$.next(false);

    // Update form control
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.setValue(address);
      control.markAsTouched();
    }

    // Update individual address fields
    this.updateAddressFields(address);

    this.addressSelected.emit(address);
    this.valueChanged.emit(address);
    this.onChange(address);
  }

  onInputFocus(): void {
    if (this.selectedAddress$.value) {
      this.searchValue = '';
    }
    this.showDropdown$.next(this.searchResults().length > 0);
  }

  onInputBlur(): void {
    // Delay hiding dropdown to allow for option selection
    setTimeout(() => {
      this.showDropdown$.next(false);
      this.onTouched();
    }, 150);
  }

  clearInput(): void {
    this.searchValue = '';
    this.selectedAddress$.next(null);
    this.showDropdown$.next(false);
    this.updateAddressFields(null);

    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.setValue(null);
      control.markAsTouched();
    }

    this.valueChanged.emit(null);
    this.onChange(null);
  }

  // Address field change handlers
  onAddressFieldChanged(field: string, value: string): void {
    if (!this.makeFieldsReadonly()) {
      const fieldMapping: { [key: string]: keyof AddressDto } = {
        'areaName': 'villWardNm',
        'thana': 'thanaNm',
        'postOffice': 'unionMuniName',
        'district': 'districtNm',
        'country': 'countryNm',
        'mouza': 'mouzaNm'
        // 'postalCode' not mapped as it's not in AddressDto
      };

      const actualField = fieldMapping[field];
      if (actualField) {
        const currentAddress = this.selectedAddress$.value || {} as AddressDto;
        const updatedAddress = { ...currentAddress, [actualField]: value };

        this.selectedAddress$.next(updatedAddress);
        this.onChange(updatedAddress);
        this.valueChanged.emit(updatedAddress);
      }
    }
  }

  // Manual field change handler
  onManualFieldChanged(value: string): void {
    this.manualInfoChanged.emit(value);
  }

  // Helper methods
  getDisplayValue(address: AddressDto | null): string {
    if (!address) return '';
    return `${address.villWardNm}, ${address.unionMuniName}, ${address.thanaNm}, ${address.districtNm}`;
  }

  /**
   * Choose the most relevant primary label for a result based on current searchValue.
   * Falls back to village/ward name.
   */
  getPrimaryField(address: AddressDto): string {
    const q = (this.searchValue || '').toLowerCase().trim();
    if (!q) return address.villWardNm;

    // Prefer the field that best matches the query
    if (address.thanaNm && address.thanaNm.toLowerCase().includes(q)) return address.thanaNm;
    if (address.unionMuniName && address.unionMuniName.toLowerCase().includes(q)) return address.unionMuniName;
    if (address.districtNm && address.districtNm.toLowerCase().includes(q)) return address.districtNm;
    if (address.mouzaNm && address.mouzaNm.toLowerCase().includes(q)) return address.mouzaNm;
    if (address.villWardNm && address.villWardNm.toLowerCase().includes(q)) return address.villWardNm;

    return address.villWardNm;
  }

  trackByFn(index: number, address: AddressDto): string {
    return address.villWardId;
  }

  // ControlValueAccessor implementation
  writeValue(value: AddressDto | null): void {
    this.selectedAddress$.next(value);
    this.searchValue = value ? this.getDisplayValue(value) : '';
    this.updateAddressFields(value);
  }

  registerOnChange(fn: (value: AddressDto | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled by computed property
  }
}
