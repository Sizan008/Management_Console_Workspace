import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface PageSelectionData {
  title: string;
  subtitle?: string;
  message: string;
  options: Array<{
    name: string;
    route: string;
    type: string;
    icon?: string;
    description?: string;
  }>;
  sourceData: any;
}

@Component({
  selector: 'app-page-selection-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule
  ],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">{{ data.title }}</h2>
        <p class="modal-subtitle" *ngIf="data.subtitle">{{ data.subtitle }}</p>
        <button mat-icon-button class="close-btn" (click)="onCancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="modal-body">
        <p class="modal-message">{{ data.message }}</p>
        
        <div class="options-grid">
          <div 
            *ngFor="let option of data.options" 
            class="option-card"
            (click)="onSelect(option)"
          >
            <div class="option-icon">
              <mat-icon>{{ option.icon || 'arrow_forward' }}</mat-icon>
            </div>
            <div class="option-content">
              <h3 class="option-name">{{ option.name }}</h3>
              <p class="option-description">{{ option.description || 'Redirect to ' + option.type }}</p>
            </div>
            <div class="option-arrow">
              <mat-icon>chevron_right</mat-icon>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      min-width: 500px;
      max-width: 600px;
    }
    
    .modal-header {
      display: flex;
      flex-direction: column;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e0e0e0;
      position: relative;
    }
    
    .modal-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
    }
    
    .modal-subtitle {
      margin: 8px 0 0;
      font-size: 0.9rem;
      color: #666;
    }
    
    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
    }
    
    .modal-body {
      padding: 24px;
    }
    
    .modal-message {
      margin: 0 0 24px;
      color: #555;
      font-size: 1rem;
    }
    
    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .option-card {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }
    
    .option-card:hover {
      border-color: #2196f3;
      background: #f8fafe;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
    }
    
    .option-icon {
      margin-right: 16px;
      color: #2196f3;
    }
    
    .option-content {
      flex: 1;
    }
    
    .option-name {
      margin: 0 0 4px;
      font-size: 1.1rem;
      font-weight: 500;
      color: #333;
    }
    
    .option-description {
      margin: 0;
      font-size: 0.9rem;
      color: #666;
    }
    
    .option-arrow {
      color: #999;
    }
    
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
    }
    
    .cancel-btn {
      color: #666;
    }
  `]
})
export class PageSelectionModal {
  constructor(
    public dialogRef: MatDialogRef<PageSelectionModal>,
    @Inject(MAT_DIALOG_DATA) public data: PageSelectionData
  ) {}

  onSelect(option: any) {
    this.dialogRef.close(option);
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}