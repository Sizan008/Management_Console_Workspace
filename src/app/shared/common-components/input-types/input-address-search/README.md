# Address Search Component

A reusable Angular component that provides address search functionality with auto-complete suggestions. This component implements `ControlValueAccessor` for seamless integration with Angular Reactive Forms.

## Features

- **Server-side autocomplete**: Real-time search using backend API
- **Debounced search**: Uses RxJS pipeline with `debounceTime`, `distinctUntilChanged`, and `switchMap`
- **Multi-field search**: Supports searching by area name, thana, post office, and district
- **Reactive Forms compatible**: Implements `ControlValueAccessor`
- **Auto-fill functionality**: Automatically fills address details on selection
- **Strong typing**: Full TypeScript support with proper interfaces
- **Responsive design**: Mobile-friendly UI
- **Loading states**: Visual feedback during search operations
- **Error handling**: Graceful error handling with user feedback

## Usage

### Basic Usage

```typescript
import { InputAddressSearch } from './shared/common-components/input-types/input-address-search/input-address-search';

@Component({
  selector: 'my-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputAddressSearch],
  template: `
    <form [formGroup]="myForm">
      <input-address-search
        formControlName="deliveryAddress"
        [label]="'Delivery Address'"
        [placeholder]="'Search for your address...'"
        [required]="true"
        (addressSelected)="onAddressSelected($event)"
        (searchChanged)="onSearchChanged($event)">
      </input-address-search>
    </form>
  `
})
export class MyFormComponent {
  myForm = this.fb.group({
    deliveryAddress: [null, Validators.required]
  });

  onAddressSelected(address: AddressDto): void {
    console.log('Selected address:', address);
  }

  onSearchChanged(query: string): void {
    console.log('Search query:', query);
  }
}
```

### Component Properties

#### Inputs
- `label: string` - Form field label (default: 'Address')
- `placeholder: string` - Input placeholder text (default: 'Search for area, thana, post office, or district...')
- `disabled: boolean` - Disable the component (default: false)
- `required: boolean` - Mark field as required (default: false)

#### Outputs
- `addressSelected: EventEmitter<AddressDto>` - Emitted when an address is selected
- `searchChanged: EventEmitter<string>` - Emitted when search query changes

## Data Models

### AddressDto Interface

```typescript
export interface AddressDto {
  id?: string;
  areaName: string;
  thana: string;
  postOffice: string;
  district: string;
  postalCode?: string;
  fullAddress?: string;
}
```

### AddressSearchResponse Interface

```typescript
export interface AddressSearchResponse {
  data: AddressDto[];
  total: number;
}
```

## Backend API Integration

The component expects a REST API endpoint that accepts search queries and returns address suggestions:

```typescript
// Expected API endpoint: GET /api/address/search?query=searchTerm&limit=10
// Response format:
{
  "data": [
    {
      "id": "1",
      "areaName": "Dhanmondi",
      "thana": "Dhanmondi",
      "postOffice": "Dhanmondi",
      "district": "Dhaka",
      "postalCode": "1205"
    }
  ],
  "total": 1
}
```

## Customization

### Styling

The component uses Angular Material theming and can be customized by overriding the CSS classes:

```scss
.address-search-field {
  // Custom field styling
}

.address-autocomplete {
  // Custom dropdown styling
}
```

### Search Behavior

Modify the search pipeline in the component constructor:

```typescript
this.filteredAddresses$ = this.searchControl.valueChanges.pipe(
  startWith(''),
  filter(value => typeof value === 'string'),
  debounceTime(300), // Adjust debounce time
  distinctUntilChanged(),
  switchMap(query => {
    // Custom search logic
  })
);
```

## Dependencies

- Angular Material (MatFormField, MatInput, MatAutocomplete)
- Angular Forms (ReactiveFormsModule)
- RxJS

## Demo

Run the demo component to see the Address Search component in action:

```typescript
import { DemoAddressSearch } from './demo-address-search';
```

The demo includes form validation, debug information, and example usage patterns.
