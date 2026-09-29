import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { InputTextBox } from '../../common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../common-components/input-types/input-text-area/input-text-area';
import { User } from '../../../core/user/user.types';


type ProfileModalData = Partial<User> & {
  description?: string;
  mobile?: string;
};

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputTextArea,
    MatIcon,
  ],
  templateUrl: './edit-profile-modal.html',
  styleUrls: ['./edit-profile-modal.scss'],
})
export class EditProfileModal implements OnInit, OnChanges {
  @Output() modalResult = new EventEmitter<any>();
  @Input() modalComponentData: ProfileModalData | null = null;

  frmGroup!: FormGroup;
  imgPreviewUrl: string | ArrayBuffer | null = null;
  selectedImageFile?: File;
  imageUploadInProgress = false;

  readonly descriptionMaxLength = 300;

  constructor(private fb: FormBuilder) {}

  /** Name shown under the avatar in the identity rail. */
  get displayName(): string {
    return this.frmGroup?.get('user_nm')?.value || this.modalComponentData?.name || '—';
  }

  /** Email shown under the name in the identity rail. */
  get displayEmail(): string {
    return this.frmGroup?.get('user_email_id')?.value || this.modalComponentData?.email || '';
  }

  /**
   * Read-only account facts. They stay in the form (disabled controls, so
   * getRawValue still returns them) but are rendered as plain text — they are
   * administrator-managed and never editable here.
   */
  get accountFacts(): { label: string; value: string }[] {
    return [
      { label: 'User ID', value: this.frmGroup?.get('user_id')?.value ?? '' },
      { label: 'Login ID', value: this.frmGroup?.get('login_id')?.value ?? '' },
      { label: 'Home Office ID', value: this.frmGroup?.get('home_office_id')?.value ?? '' },
    ];
  }

  get descriptionLength(): number {
    return (this.frmGroup?.get('user_descrip')?.value ?? '').length;
  }

  ngOnInit(): void {
    this.frmGroup = this.fb.group({
      user_id: [{ value: '', disabled: true }],
      home_office_id: [{ value: '', disabled: true }],
      login_id: [{ value: '', disabled: true }],
      user_nm: ['', [Validators.required, Validators.maxLength(100)]],
      user_descrip: ['', [Validators.maxLength(this.descriptionMaxLength)]],
      user_email_id: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      mobile_number: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9+\-\s()]{0,30}$/)]],
      user_img: [null],
    });

    if (this.modalComponentData) {
      console.log('ngOnInit patch with data:', this.modalComponentData);
      this.patchFormWithData(this.modalComponentData);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.frmGroup || !changes['modalComponentData']) {
      return;
    }

    if (this.modalComponentData) {
      console.log('ngOnChanges patch with data:', this.modalComponentData);
      this.patchFormWithData(this.modalComponentData);
    }
  }

  getModalResult() {
    return this.frmGroup.getRawValue();
  }

  onImageError() {
    this.imgPreviewUrl = null;
  }

  async onProfilePicSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.selectedImageFile = file;
    this.imageUploadInProgress = true;

    try {
      const base64String = await this.convertFileToBase64(file);
      this.frmGroup.patchValue({ user_img: base64String });
      this.imgPreviewUrl = `data:${file.type};base64,${base64String}`;
    } catch (error) {
      console.error('Failed to convert profile picture to base64', error);
    } finally {
      this.imageUploadInProgress = false;
    }
  }

  private patchFormWithData(data: ProfileModalData): void {
    console.log('patchFormWithData called with:', data);
    const normalizedImage = this.extractBase64Value(data.avatar ?? null);
    this.frmGroup.patchValue({
      user_id: data.employeeId ?? '',
      login_id: data.username ?? '',
      home_office_id: data.officeId ?? '',
      user_nm: data.name ?? '',
      user_email_id: data.email ?? '',
      user_descrip: data.description ?? '',
      mobile_number: data.mobile ?? '',
      user_img: normalizedImage,
    });

    this.imgPreviewUrl = this.buildPreviewSrc(data.avatar ?? null);
    console.log('Form values after patch:', this.frmGroup.getRawValue());
  }

  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64 = result.split(',')[1] ?? result;
          resolve(base64);
        } else {
          reject('Unsupported file result');
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  private extractBase64Value(value: string | null): string | null {
    if (!value) {
      return null;
    }
    if (value.startsWith('data:')) {
      return value.split(',')[1] ?? null;
    }
    return value;
  }

  private buildPreviewSrc(value: string | null): string | null {
    if (!value) {
      return null;
    }
    if (value.startsWith('data:')) {
      return value;
    }
    // Assume base64 without prefix; default to png
    if (/^[a-zA-Z0-9+/=]+$/.test(value.replace(/\s+/g, ''))) {
      return `data:image/png;base64,${value}`;
    }
    return value;
  }
}
