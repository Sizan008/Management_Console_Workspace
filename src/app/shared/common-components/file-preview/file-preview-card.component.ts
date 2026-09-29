import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FilePreviewData } from './file-preview.component';

/**
 * Reusable file preview card component
 * Displays file info with action button for preview/download
 */
@Component({
  selector: 'file-preview-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
      <div class="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-md transition">
        <div class="space-y-1 flex-1">
          <div class="text-sm font-semibold text-gray-800">
            {{ fileData?.fileName || 'Unknown File' }}
          </div>
          <div class="text-xs text-gray-500">
            {{ fileData?.mimeType || 'application/octet-stream' }}
          </div>
          @if(getFileSize()) {
            <div class="text-xs text-gray-400">
              {{ formatFileSize(getFileSize()!) }}
            </div>
          }
        </div>
        </div>
      <button
        type="button"
        class="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow hover:bg-green-600 transition flex-shrink-0 ml-4"
        [attr.aria-label]="'Preview ' + fileData?.fileName"
        (click)="onPreview()">
        <mat-icon>visibility</mat-icon>
      </button>

  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})

export class FilePreviewCardComponent implements OnInit {
  @Input() fileData: FilePreviewData | null = null;
  @Output() previewClicked = new EventEmitter<FilePreviewData>();

  ngOnInit() {
    if (!this.fileData) {
      console.warn('FilePreviewCardComponent: fileData input is required');
    }
  }

  onPreview(): void {
    if (this.fileData) {
      this.previewClicked.emit(this.fileData);
    }
  }

  /**
   * Calculate or get file size
   */
  getFileSize(): number | undefined {
    if (!this.fileData) return undefined;

    // Use provided fileSize
    if (this.fileData.fileSize) {
      return this.fileData.fileSize;
    }

    // Calculate from Blob
    if (this.fileData.data) {
      return this.fileData.data.size;
    }

    // Calculate from base64 (rough estimate: base64 is ~33% larger)
    if (this.fileData.base64) {
      const base64str = this.fileData.base64;
      const padding = (base64str.match(/=/g) || []).length;
      return Math.floor((base64str.length * 3) / 4) - padding;
    }

    return undefined;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
