import { Component, inject, signal, computed, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, of } from 'rxjs';
import * as XLSX from 'xlsx';

export interface FilePreviewData {
  base64?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  data?: Blob;
}

export type FileType = 'pdf' | 'excel' | 'image' | 'text' | 'unknown';

interface ExcelSheet {
  name: string;
  data: any[][];
  headers: string[];
}

@Component({
  selector: 'file-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTableModule,
    MatCardModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="file-info">
          <mat-icon>{{ fileIcon() }}</mat-icon>
          <div class="file-details">
            <span class="file-name">{{ fileData()?.fileName || 'Unknown file' }}</span>
            <span class="file-type">{{ fileType().toUpperCase() }}</span>
          </div>
        </div>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="preview-loading">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading {{ fileType() }} preview...</p>
          </div>
        }

        <!-- Error State -->
        @else if (error()) {
          <div class="preview-error">
            <mat-icon class="error-icon">error_outline</mat-icon>
            <h3>Preview Error</h3>
            <p>{{ error() }}</p>
            <button mat-raised-button color="primary" (click)="retry()">
              <mat-icon>refresh</mat-icon>
              Retry
            </button>
          </div>
        }

        <!-- Preview Content -->
        @else {
          <!-- PDF Preview -->
          @if (fileType() === 'pdf' && previewUrl()) {
            <iframe
              [src]="previewUrl()"
              class="pdf-preview"
              frameborder="0"
              width="100%"
              height="100%">
            </iframe>
          }

          <!-- Excel Preview -->
          @else if (fileType() === 'excel' && excelSheets().length > 0) {
            <div class="excel-preview">
              @if (excelSheets().length > 1) {
                <mat-tab-group class="excel-tabs">
                  @for (sheet of excelSheets(); track sheet.name) {
                    <mat-tab [label]="sheet.name">
                      <div class="sheet-content">
                        <div class="sheet-info">
                          <span>{{ sheet.data.length }} rows × {{ sheet.headers.length }} columns</span>
                        </div>
                        <div class="table-container">
                          <table class="excel-table">
                            <thead>
                              <tr>
                                @for (header of sheet.headers; track $index) {
                                  <th>{{ header }}</th>
                                }
                              </tr>
                            </thead>
                            <tbody>
                              @for (row of sheet.data; track $index) {
                                <tr>
                                  @for (cell of row; track $index) {
                                    <td [title]="cell">{{ cell }}</td>
                                  }
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </mat-tab>
                  }
                </mat-tab-group>
              } @else {
                <div class="sheet-content">
                  <div class="sheet-info">
                    <h4>{{ excelSheets()[0].name }}</h4>
                    <span>{{ excelSheets()[0].data.length }} rows × {{ excelSheets()[0].headers.length }} columns</span>
                  </div>
                  <div class="table-container">
                    <table class="excel-table">
                      <thead>
                        <tr>
                          @for (header of excelSheets()[0].headers; track $index) {
                            <th>{{ header }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of excelSheets()[0].data; track $index) {
                          <tr>
                            @for (cell of row; track $index) {
                              <td [title]="cell">{{ cell }}</td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Image Preview -->
          @else if (fileType() === 'image' && previewUrl()) {
            <div class="image-preview-container">
              <img
                [src]="previewUrl()"
                class="image-preview"
                alt="File preview" />
            </div>
          }

          <!-- Text Preview -->
          @else if (fileType() === 'text' && textContent()) {
            <div class="text-preview">
              <pre>{{ textContent() }}</pre>
            </div>
          }

          <!-- Unsupported -->
          @else {
            <div class="no-preview">
              <mat-icon class="large-icon">{{ fileIcon() }}</mat-icon>
              <h3>{{ fileData()?.fileName || 'File' }}</h3>
              <p>Preview not available for this file type</p>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      height: 80vh;
      max-height: 80vh;
      background: #fff;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5;

      .file-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .file-details {
          display: flex;
          flex-direction: column;

          .file-name {
            font-weight: 500;
            color: #333;
          }

          .file-type {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
          }
        }
      }
    }

    .dialog-content {
      flex: 1;
      overflow: auto;
      background: #fff;
    }

    .preview-loading,
    .preview-error,
    .no-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      text-align: center;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 1rem;
        color: #666;
      }

      .error-icon { color: #f44336; }
      .large-icon { font-size: 64px; width: 64px; height: 64px; }
    }

    .pdf-preview {
      width: 100%;
      height: 100%;
      border: none;
    }

    .excel-preview {
      height: 100%;
      display: flex;
      flex-direction: column;

      .excel-tabs {
        height: 100%;

        ::ng-deep .mat-mdc-tab-body-wrapper {
          flex: 1;
        }
      }

      .sheet-content {
        padding: 1rem;
        height: 100%;
        display: flex;
        flex-direction: column;

        .sheet-info {
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e0e0e0;

          h4 {
            margin: 0 0 0.25rem 0;
            color: #333;
          }

          span {
            color: #666;
            font-size: 14px;
          }
        }

        .table-container {
          flex: 1;
          overflow: auto;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      }

      .excel-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;

        th, td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        th {
          background: #f5f5f5;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        tr:nth-child(even) {
          background: #f9f9f9;
        }

        tr:hover {
          background: #f0f0f0;
        }
      }
    }

    .image-preview-container {
      width: 100%;
      height: 100%;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;

      .image-preview {
        max-width: 100%;
        max-height: 100%;
      }
    }

    .text-preview {
      padding: 1rem;
      height: 100%;
      overflow: auto;

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.4;
      }
    }
  `]
})
export class FilePreviewDialogComponent {
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<FilePreviewDialogComponent>);

  private dialogData = inject(MAT_DIALOG_DATA, { optional: true }) as FilePreviewData | null;
  readonly fileData = signal<FilePreviewData | null>(this.dialogData ?? null);

  // Internal state
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly excelSheets = signal<ExcelSheet[]>([]);
  readonly textContent = signal<string>('');

  private blobUrl: string | null = null;

  readonly fileType = computed<FileType>(() => {
    const data = this.fileData();
    if (!data) return 'unknown';

    const mimeType = data.mimeType?.toLowerCase() || '';
    const fileName = data.fileName?.toLowerCase() || '';

    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
      return 'pdf';
    }

    if (mimeType.includes('sheet') || mimeType.includes('excel') ||
        fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ||
        fileName.endsWith('.csv')) {
      return 'excel';
    }

    if (mimeType.startsWith('image/') || this.isImageFile(fileName)) {
      return 'image';
    }

    if (mimeType.startsWith('text/') || this.isTextFile(fileName)) {
      return 'text';
    }

    return 'unknown';
  });

  readonly fileIcon = computed<string>(() => {
    switch (this.fileType()) {
      case 'pdf': return 'picture_as_pdf';
      case 'excel': return 'table_chart';
      case 'image': return 'image';
      case 'text': return 'description';
      default: return 'insert_drive_file';
    }
  });

  constructor() {
    effect(() => {
      if (this.fileData()) {
        this.loadPreview();
      }
    });
  }

  ngOnDestroy() {
    this.revokeObjectUrl();
  }

  private async loadPreview() {
    const data = this.fileData();
    if (!data) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const type = this.fileType();

      if (type === 'excel') {
        await this.loadExcelPreview(data);
      } else if (type === 'image') {
        await this.loadImagePreview(data);
      } else if (type === 'text') {
        await this.loadTextPreview(data);
      } else if (type === 'pdf') {
        await this.loadPdfPreview(data);
      } else {
        throw new Error(`Unsupported file type: ${type}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to load ${this.fileType()}`;
      this.error.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadExcelPreview(data: FilePreviewData) {
    let arrayBuffer: ArrayBuffer;

    if (data.base64) {
      const binaryString = atob(data.base64);
      arrayBuffer = new ArrayBuffer(binaryString.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i);
      }
    } else if (data.data) {
      arrayBuffer = await data.data.arrayBuffer();
    } else if (data.url) {
      const response = await fetch(data.url);
      arrayBuffer = await response.arrayBuffer();
    } else {
      throw new Error('No valid Excel data provided');
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheets: ExcelSheet[] = [];

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length > 0) {
        const headers = jsonData[0]?.map((cell, index) =>
          cell?.toString() || `Column ${index + 1}`
        ) || [];

        const dataRows = jsonData.slice(1, 10000); // Limit to 10k rows for performance

        sheets.push({
          name: sheetName,
          headers,
          data: dataRows
        });
      }
    });

    this.excelSheets.set(sheets);
  }

  private async loadImagePreview(data: FilePreviewData) {
    let url: string;

    if (data.base64) {
      const mimeType = data.mimeType || this.getMimeTypeFromExtension(data.fileName);
      url = data.base64.startsWith('data:') ? data.base64 : `data:${mimeType};base64,${data.base64}`;
    } else if (data.data) {
      url = URL.createObjectURL(data.data);
      this.blobUrl = url;
    } else if (data.url) {
      url = data.url;
    } else {
      throw new Error('No valid image data provided');
    }

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.previewUrl.set(safeUrl);
  }

  private async loadTextPreview(data: FilePreviewData) {
    let text: string;

    if (data.base64) {
      text = atob(data.base64);
    } else if (data.data) {
      text = await data.data.text();
    } else if (data.url) {
      const response = await fetch(data.url);
      text = await response.text();
    } else {
      throw new Error('No valid text data provided');
    }

    this.textContent.set(text);
  }

private async loadPdfPreview(data: FilePreviewData) {
  let url: string;

  if (data.base64) {
    url = data.base64.startsWith('data:')
      ? data.base64
      : `data:application/pdf;base64,${data.base64}`;
  } else if (data.data) {
    url = URL.createObjectURL(data.data);
    this.blobUrl = url;
  } else if (data.url) {
    url = data.url;
  } else {
    throw new Error('No valid PDF data provided');
  }

  url = `${url}#toolbar=0`;

  const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  this.previewUrl.set(safeUrl);
}

  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
    return imageExtensions.some(ext => fileName.endsWith(ext));
  }

  private isTextFile(fileName: string): boolean {
    const textExtensions = ['.txt', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.md'];
    return textExtensions.some(ext => fileName.endsWith(ext));
  }

  private getMimeTypeFromExtension(fileName?: string): string {
    if (!fileName) return 'application/octet-stream';

    const ext = fileName.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
      'svg': 'image/svg+xml', 'bmp': 'image/bmp', 'tiff': 'image/tiff',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'csv': 'text/csv',
      'txt': 'text/plain', 'json': 'application/json',
      'xml': 'application/xml', 'html': 'text/html',
      'css': 'text/css', 'js': 'text/javascript'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private revokeObjectUrl() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  close() {
    this.dialogRef.close();
  }

  retry() {
    this.loadPreview();
  }
}
