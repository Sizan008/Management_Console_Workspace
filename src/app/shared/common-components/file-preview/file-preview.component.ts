import { Component, input, output, signal, computed, OnDestroy, inject, effect, ViewChild, ElementRef } from
'@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  fileSize?: number; // in bytes
}

export type FileType = 'pdf' | 'excel' | 'image' | 'text' | 'unknown';
export type PreviewMode = 'iframe' | 'embed' | 'object' | 'table' | 'image';

interface ExcelSheet {
  name: string;
  data: any[][];
  headers: string[];
}

@Component({
  selector: 'file-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTableModule,
    MatCardModule
  ],
  template: `
    <div class="file-preview-container" [style.width]="width()" [style.height]="height()">

      <!-- Debug Info -->
      @if (showDebug()) {
        <div class="debug-info">
          <h4>Debug Information:</h4>
          <p><strong>File Type:</strong> {{ fileType() }}</p>
          <p><strong>MIME Type:</strong> {{ fileData()?.mimeType || 'Not specified' }}</p>
          <p><strong>File Name:</strong> {{ fileData()?.fileName || 'Not specified' }}</p>
          <p><strong>Has Base64:</strong> {{ !!fileData()?.base64 }}</p>
          <p><strong>Has URL:</strong> {{ !!fileData()?.url }}</p>
          <p><strong>Can Preview:</strong> {{ canPreview() }}</p>
          @if (debugMessage()) {
            <p><strong>Debug:</strong> {{ debugMessage() }}</p>
          }
        </div>
      }

      <!-- Loading State -->
      @if (isLoading() || loading()) {
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

          <div class="error-actions">
            <button mat-raised-button color="primary" (click)="retry()">
              <mat-icon>refresh</mat-icon>
              Retry
            </button>
            <button mat-raised-button color="accent" (click)="downloadFile()">
              <mat-icon>download</mat-icon>
              Download File
            </button>
          </div>
        </div>
      }

      <!-- No File State -->
      @else if (!fileData()) {
        <div class="preview-placeholder">
          <mat-icon class="placeholder-icon">insert_drive_file</mat-icon>
          <p>{{ placeholder() }}</p>
        </div>
      }

      <!-- File Preview Content -->
      @else {
        <div class="preview-content">

          <!-- Controls -->
          @if (showControls()) {
            <div class="preview-controls">
              <div class="file-info">
                <mat-icon>{{ fileIcon() }}</mat-icon>
                <div class="file-details">
                  <span class="file-name">{{ fileData()?.fileName || 'Unknown file' }}</span>
                  <span class="file-type">{{ fileType().toUpperCase() }}</span>
                </div>
              </div>

              <div class="control-buttons">
                @if (fileType() === 'image') {
                  <button mat-icon-button matTooltip="Zoom In" (click)="zoomIn()">
                    <mat-icon>zoom_in</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Zoom Out" (click)="zoomOut()">
                    <mat-icon>zoom_out</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Reset Zoom" (click)="resetZoom()">
                    <mat-icon>fit_screen</mat-icon>
                  </button>
                }

                @if (showDownload()) {
                  <button mat-icon-button matTooltip="Download" (click)="downloadFile()">
                    <mat-icon>download</mat-icon>
                  </button>
                }

                @if (showFullscreen()) {
                  <button mat-icon-button matTooltip="Open in modal" (click)="openFullscreen()">
                    <mat-icon>fullscreen</mat-icon>
                  </button>
                }

                <button mat-icon-button matTooltip="Toggle debug" (click)="toggleDebug()">
                  <mat-icon>bug_report</mat-icon>
                </button>
              </div>
            </div>
          }

          <!-- Preview Area -->
          <div class="preview-area" [class.scrollable]="fileType() === 'excel'">

            <!-- PDF Preview -->
            @if (fileType() === 'pdf' && previewUrl()) {
              <iframe
                [src]="previewUrl()"
                class="pdf-preview"
                frameborder="0"
                width="100%"
                height="100%"
                (load)="onFileLoad()"
                (error)="onFileError('PDF failed to load')">
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
                  <!-- Single sheet -->
                  <div class="sheet-content">
                    <div class="sheet-info">
                      <h4>{{ excelSheets()[0].name }}</h4>
                      <span>{{ excelSheets()[0].data.length }} rows × {{ excelSheets()[0].headers.length }}
                        columns</span>
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
              <div class="image-preview-container" #imageContainer>
                <img
                  [src]="previewUrl()"
                  class="image-preview"
                  [style.transform]="'scale(' + imageZoom() + ')'"
                  alt="File preview"
                  (load)="onFileLoad()"
                  (error)="onFileError('Image failed to load')"
                  #imageElement />
              </div>
            }

            <!-- Text Preview -->
            @else if (fileType() === 'text' && textContent()) {
              <div class="text-preview">
                <pre>{{ textContent() }}</pre>
              </div>
            }

            <!-- Unsupported File Type -->
            @else {
              <div class="no-preview">
                <mat-icon class="large-icon">{{ fileIcon() }}</mat-icon>
                <h3>{{ fileData()?.fileName || 'File' }}</h3>
                <p>Preview not available for this file type</p>

                @if (showDownload()) {
                  <button mat-raised-button color="primary" (click)="downloadFile()">
                    <mat-icon>download</mat-icon>
                    Download File
                  </button>
                }
              </div>
            }

          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .file-preview-container {
      display: flex;
      flex-direction: column;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #fafafa;
    }

    .debug-info {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 1rem;
      margin: 0.5rem;
      border-radius: 4px;
      font-size: 12px;

      h4 { margin: 0 0 0.5rem 0; }
      p { margin: 0.25rem 0; }
    }

    .preview-loading,
    .preview-error,
    .preview-placeholder,
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

    .error-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .preview-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .preview-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;

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
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .file-type {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
          }
        }
      }

      .control-buttons {
        display: flex;
        gap: 0.25rem;
      }
    }

    .preview-area {
      flex: 1;
      background: #fff;
      position: relative;

      &.scrollable {
        overflow: auto;
      }
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
        max-width: none;
        max-height: none;
        transition: transform 0.2s ease;
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
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

    @media (max-width: 768px) {
      .preview-controls {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;

        .control-buttons {
          align-self: flex-end;
        }
      }

      .excel-table {
        font-size: 12px;

        th, td {
          padding: 6px 8px;
          max-width: 150px;
        }
      }

      .error-actions {
        flex-direction: column;
      }
    }
  `]
})
export class FilePreviewComponent implements OnDestroy {
  @ViewChild('imageElement') imageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('imageContainer') imageContainer!: ElementRef<HTMLDivElement>;

  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);

  // Inputs
  readonly fileData = input<FilePreviewData | null>(null);
  readonly width = input<string>('100%');
  readonly height = input<string>('500px');
  readonly showControls = input<boolean>(true);
  readonly showDownload = input<boolean>(false);
  readonly showFullscreen = input<boolean>(true);
  readonly loading = input<boolean>(false);
  readonly placeholder = input<string>('No file to preview');
  readonly maxExcelRows = input<number>(1000); // Limit rows for performance

  // Outputs
  readonly onDownload = output<FilePreviewData>();
  readonly onFullscreen = output<FilePreviewData>();
  readonly onError = output<string>();
  readonly onLoad = output<void>();

  // Internal state
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly showDebug = signal<boolean>(false);
  readonly debugMessage = signal<string>('');
  readonly excelSheets = signal<ExcelSheet[]>([]);
  readonly textContent = signal<string>('');
  readonly imageZoom = signal<number>(1);

  private blobUrl: string | null = null;

  // Computed properties
  readonly fileType = computed<FileType>(() => {
    const data = this.fileData();
    if (!data) return 'unknown';

    const mimeType = data.mimeType?.toLowerCase() || '';
    const fileName = data.fileName?.toLowerCase() || '';

    // PDF
    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
      return 'pdf';
    }

    // Excel
    if (mimeType.includes('sheet') || mimeType.includes('excel') ||
        fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ||
        fileName.endsWith('.csv')) {
      return 'excel';
    }

    // Images
    if (mimeType.startsWith('image/') || this.isImageFile(fileName)) {
      return 'image';
    }

    // Text files
    if (mimeType.startsWith('text/') || this.isTextFile(fileName)) {
      return 'text';
    }

    return 'unknown';
  });

  readonly canPreview = computed<boolean>(() => {
    const type = this.fileType();
    return type === 'pdf' || type === 'excel' || type === 'image' || type === 'text';
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
    if (!data) {
      this.resetState();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.debugMessage.set('Starting to load file...');

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

      this.debugMessage.set(`${type} loaded successfully`);
      this.onLoad.emit();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to load ${this.fileType()}`;
      this.error.set(errorMessage);
      this.debugMessage.set(`Error: ${errorMessage}`);
      this.onError.emit(errorMessage);
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

    workbook.SheetNames.forEach(sheetName  => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length > 0) {
        // Get headers from first row
        const headers = jsonData[0]?.map((cell, index) =>
          cell?.toString() || `Column ${index + 1}`
        ) || [];

        // Get data rows (limit for performance)
        const dataRows = jsonData.slice(1, this.maxExcelRows() + 1);

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
    this.imageZoom.set(1); // Reset zoom
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
      url = data.base64.startsWith('data:') ? data.base64 : `data:application/pdf;base64,${data.base64}`;
    } else if (data.data) {
      url = URL.createObjectURL(data.data);
      this.blobUrl = url;
    } else if (data.url) {
      url = data.url;
    } else {
      throw new Error('No valid PDF data provided');
    }

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.previewUrl.set(safeUrl);
  }

  // Utility methods
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

  private resetState() {
    this.previewUrl.set(null);
    this.excelSheets.set([]);
    this.textContent.set('');
    this.imageZoom.set(1);
    this.error.set(null);
    this.debugMessage.set('');
  }

  private revokeObjectUrl() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  // Public methods
  downloadFile() {
    const data = this.fileData();
    if (!data) return;

    try {
      const link = document.createElement('a');

      if (data.base64) {
        const mimeType = data.mimeType || this.getMimeTypeFromExtension(data.fileName);
        const dataUrl = data.base64.startsWith('data:') ? data.base64 : `data:${mimeType};base64,${data.base64}`;
        link.href = dataUrl;
      } else if (data.data) {
        const url = URL.createObjectURL(data.data);
        link.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (data.url) {
        link.href = data.url;
        link.target = '_blank';
      }

      link.download = data.fileName || `file.${this.fileType()}`;
      link.click();

      this.onDownload.emit(data);
    } catch (error) {
      this.error.set('Download failed');
    }
  }

  /**
   * Emits the "fullscreen" intent so the parent can decide how to present it
   * (e.g., open `FilePreviewDialogComponent` in a modal).
   */
  openFullscreen() {
    const data = this.fileData();
    if (!data) return;

    try {
      this.onFullscreen.emit(data);
    } catch (error) {
      this.error.set('Failed to open fullscreen preview');
    }
  }

  /**
   * Backward-compatible alias (previous behavior was "open in new tab").
   * Kept to avoid breaking existing callers.
   */
  openInNewTab() {
    this.openFullscreen();
  }

  // Image zoom controls
  zoomIn() {
    this.imageZoom.set(Math.min(this.imageZoom() + 0.25, 5));
  }

  zoomOut() {
    this.imageZoom.set(Math.max(this.imageZoom() - 0.25, 0.25));
  }

  resetZoom() {
    this.imageZoom.set(1);
  }

  toggleDebug() {
    this.showDebug.set(!this.showDebug());
  }

  retry() {
    this.resetState();
    this.loadPreview();
  }

  onFileLoad() {
    this.debugMessage.set('File loaded successfully');
    this.onLoad.emit();
  }

  onFileError(message: string) {
    this.error.set(message);
    this.debugMessage.set(`File load error: ${message}`);
  }
}
