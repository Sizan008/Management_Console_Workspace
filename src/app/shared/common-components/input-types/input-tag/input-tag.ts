import {Component, input, output, signal, effect, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, forwardRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {MatChipsModule, MatChipEditedEvent, MatChipInputEvent} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CdkDragDrop, moveItemInArray, DragDropModule} from '@angular/cdk/drag-drop';
import {Observable, Subject, debounceTime, switchMap} from 'rxjs';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {HttpClient} from '@angular/common/http';

export interface TagItem {
  id?: string | number;
  name?: string;
  value?: string;
  display?: string;
  [key: string]: any;
}

@Component({
  selector: 'input-tag',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatTooltipModule,
    DragDropModule
  ],
  templateUrl: './input-tag.html',
  styleUrls: ['./input-tag.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputTagComponent),
      multi: true
    }
  ]
})
export class InputTagComponent implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor {
  // Input bindings
  readonly placeholder = input<string>('Add a tag...');
  readonly label = input<string>('');
  readonly maxItems = input<number | null>(null);
  readonly minItems = input<number>(0);
  readonly allowDuplicates = input<boolean>(false);
  readonly modelAsStrings = input<boolean>(true);
  readonly removable = input<boolean>(true);
  readonly editable = input<boolean>(false);
  readonly draggable = input<boolean>(true);
  readonly disabled = input<boolean>(false);
  readonly displayBy = input<string>('name');
  readonly identifyBy = input<string>('id');
  readonly autocompleteItems = input<TagItem[] | string[]>([]);
  readonly autocompleteItemsApiEndpoint = input<string>('');
  readonly autocompleteObservable = input<((text: string) => Observable<any>) | null>(null);
  readonly onlyFromAutocomplete = input<boolean>(true);
  readonly separatorKeysCodes = input<number[]>([ENTER, COMMA]);
  readonly theme = input<string>('default');
  readonly inputId = input<string>('');
  readonly inputClass = input<string>('');
  readonly tooltip = input<string>('');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');

  // Outputs
  readonly onAdd = output<TagItem | string>();
  readonly onRemove = output<TagItem | string>();
  readonly onSelect = output<TagItem | string>();
  readonly onTagEdited = output<{oldValue: TagItem | string; newValue: TagItem | string}>();
  readonly onTextChange = output<string>();
  readonly onFocus = output<Event>();
  readonly onBlur = output<Event>();

  // View references
  @ViewChild('chipGrid') chipGrid!: ElementRef;
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;
  @ViewChild('auto') auto!: any;

  // Services
  private http = inject(HttpClient);

  // Input for API endpoint
  readonly apiEndpoint = input<string>('');
  readonly apiSearchParam = input<string>('search');
  readonly isLoading = signal<boolean>(false);

  // Private subject for API calls
  private apiSearch$ = new Subject<string>();

  // Internal state
  tags = signal<(TagItem | string)[]>([]);
  filteredItems = signal<(TagItem | string)[]>([]);
  currentInputValue = signal<string>('');
  hasError = signal<boolean>(false);
  errorMessage = signal<string>('');
  private destroy$ = new Subject<void>();
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      this.setupAutocompleteFiltering();
    });
  }

  ngOnInit() {
    // Load autocomplete items from API if endpoint is provided
    if (this.autocompleteItemsApiEndpoint()) {
      this.loadAutocompleteItemsFromApi();
    }

    // Setup API search if endpoint is provided
    this.setupApiSearch();
  }

  /**
   * Load initial autocomplete items from API
   */
  private loadAutocompleteItemsFromApi(): void {
    this.isLoading.set(true);

    this.http.get<TagItem[] | string[]>(this.autocompleteItemsApiEndpoint()).subscribe({
      next: (items) => {
        this.filteredItems.set(items);
        this.isLoading.set(false);
        console.log('Autocomplete items loaded from API:', items);
      },
      error: (error) => {
        console.error('Error loading autocomplete items from API:', error);
        this.isLoading.set(false);
        this.filteredItems.set([]);
      }
    });
  }

  /**
   * Setup API-based autocomplete search
   * Subscribes to search input and calls API endpoint
   */
  private setupApiSearch(): void {
    if (!this.apiEndpoint()) {
      return;
    }

    this.apiSearch$.pipe(
      debounceTime(300),
      switchMap((query: string) => {
        if (!query.trim()) {
          this.filteredItems.set([]);
          return [];
        }

        this.isLoading.set(true);
        const params = { [this.apiSearchParam()]: query };

        return this.http.get<TagItem[]>(this.apiEndpoint(), { params }).pipe(
          debounceTime(300),
          switchMap(results => {
            this.isLoading.set(false);
            this.filteredItems.set(results);
            return [];
          })
        );
      })
    ).subscribe();
  }

  /**
   * Trigger API search when user types
   * Call this from onInputChange when apiEndpoint is set
   */
  searchFromApi(query: string): void {
    if (this.apiEndpoint()) {
      this.apiSearch$.next(query);
    }
  }

  ngAfterViewInit() {
    // Any view-dependent initialization
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(obj: any): void {
    if (obj) {
      this.tags.set(Array.isArray(obj) ? obj : []);
    } else {
      this.tags.set([]);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handle disabled state if needed
  }

  private setupAutocompleteFiltering(): void {
    const searchText = this.currentInputValue();
    const items = this.autocompleteItems();

    if (!items || items.length === 0) {
      this.filteredItems.set([]);
      return;
    }

    if (!searchText.trim()) {
      this.filteredItems.set(items);
      return;
    }

    const filtered = items.filter((item: string | TagItem) => {
      const displayValue = this.getDisplayValue(item);
      return displayValue.toLowerCase().includes(searchText.toLowerCase());
    });

    this.filteredItems.set(filtered);
  }

  // Helper methods
  getPlaceholderText(): string {
    return this.currentInputValue().length === 0 ? this.placeholder() : '';
  }

  isDisabled(): boolean {
    return this.disabled();
  }

  hasErrors(): boolean {
    return this.hasError();
  }

  getErrorMessage(): string {
    return this.errorMessage();
  }

  isTagEditable(tag: TagItem | string): boolean {
    return this.editable();
  }

  isTagRemovable(tag: TagItem | string): boolean {
    return this.removable();
  }

  isTagReadonly(tag: TagItem | string): boolean {
    return this.disabled();
  }

  dragZone(): string[] {
    return [];
  }

  // Event handlers
  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (!value) {
      event.chipInput!.clear();
      return;
    }

    // Check if duplicates are allowed
    if (!this.allowDuplicates() && this.isDuplicate(value)) {
      event.chipInput!.clear();
      this.currentInputValue.set('');
      return;
    }

    // Check max items limit
    if (this.maxItems() !== null && this.tags().length >= this.maxItems()!) {
      event.chipInput!.clear();
      this.currentInputValue.set('');
      return;
    }

    // Check if only from autocomplete
    if (this.onlyFromAutocomplete() && !this.isValidAutocompleteItem(value)) {
      event.chipInput!.clear();
      this.currentInputValue.set('');
      return;
    }

    const newTag = this.modelAsStrings() ? value : { [this.displayBy()]: value };
    const newTags = [...this.tags(), newTag];

    this.tags.set(newTags);
    this.onChange(newTags);
    this.onAdd.emit(newTag);

    // Reset the input value
    event.chipInput!.clear();
    this.currentInputValue.set('');
  }

  removeTag(tag: string | TagItem): void {
    const currentTags = [...this.tags()];
    const filteredTags = currentTags.filter(t => !this.isSameTag(t, tag));

    this.tags.set(filteredTags);
    this.onChange(filteredTags);
    this.onRemove.emit(tag);
  }

  editTag(tag: string | TagItem, event: MatChipEditedEvent): void {
    const value = event.value.trim();

    if (!value) {
      this.removeTag(tag);
      return;
    }

    const currentTags = [...this.tags()];
    const tagIndex = currentTags.findIndex(t => this.isSameTag(t, tag));

    if (tagIndex >= 0) {
      const newTag = this.modelAsStrings() ? value : { [this.displayBy()]: value };
      currentTags[tagIndex] = newTag;
      this.tags.set(currentTags);
      this.onChange(currentTags);
      this.onTagEdited.emit({ oldValue: tag, newValue: newTag });
    }
  }

  selectTag(event: MatAutocompleteSelectedEvent): void {
    const selectedItem = event.option.value;

    // Check if duplicates are allowed
    if (!this.allowDuplicates() && this.isDuplicate(selectedItem)) {
      this.resetInput();
      return;
    }

    // Check max items limit
    if (this.maxItems() !== null && this.tags().length >= this.maxItems()!) {
      this.resetInput();
      return;
    }

    const newTags = [...this.tags(), selectedItem];
    this.tags.set(newTags);
    this.onChange(newTags);
    this.onSelect.emit(selectedItem);
    this.onAdd.emit(selectedItem);

    // Reset input
    this.resetInput();
  }

  onInputChange(value: string): void {
    this.currentInputValue.set(value);
    this.onTextChange.emit(value);
  }

  onInputFocus(event: Event): void {
    this.onFocus.emit(event);
  }

  onInputBlur(event: Event): void {
    this.onBlur.emit(event);
  }

  onPasteEvent(event: ClipboardEvent): void {
    // Handle paste if needed
  }

  // Drag and drop functionality
  drop(event: CdkDragDrop<(string | TagItem)[]>): void {
    if (!this.draggable() || this.disabled()) return;

    const currentTags = [...this.tags()];
    moveItemInArray(currentTags, event.previousIndex, event.currentIndex);
    this.tags.set(currentTags);
    this.onChange(currentTags);
  }

  // Helper methods
  private isDuplicate(item: string | TagItem): boolean {
    return this.tags().some(tag => this.isSameTag(tag, item));
  }

  private isSameTag(tag1: string | TagItem, tag2: string | TagItem): boolean {
    const val1 = this.getDisplayValue(tag1);
    const val2 = this.getDisplayValue(tag2);
    return val1 === val2;
  }

  private isValidAutocompleteItem(value: string): boolean {
    const items = this.autocompleteItems();
    return items.some(item => {
      const itemValue = this.getDisplayValue(item);
      return itemValue === value;
    });
  }

  private resetInput(): void {
    this.currentInputValue.set('');
    if (this.inputField?.nativeElement) {
      this.inputField.nativeElement.value = '';
    }
  }

  getDisplayValue(item: string | TagItem): string {
    if (typeof item === 'string') return item;
    if (!item) return '';
    return (item as any)[this.displayBy()] || item.toString();
  }

  getItemValue(item: string | TagItem): any {
    if (typeof item === 'string') return item;
    if (!item) return null;
    return (item as any)[this.identifyBy()] || item;
  }

  // TrackBy function for ngFor optimization
  trackByFn = (index: number, item: any): any => {
    if (typeof item === 'string') return item;
    return this.getItemValue(item) || index;
  };
}
