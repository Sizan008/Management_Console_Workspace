// generic-modal.component.ts - Angular 20 Compatible with Enhanced Design
import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ContentChild,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
  Type,
  ComponentRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericButton } from '../generic-button/generic-button';

@Component({
  selector: 'generic-modal',
  standalone: true,
  imports: [CommonModule, GenericButton],
  templateUrl: './generic-modal.html',
  styleUrls: ['./generic-modal.scss'],

})
export class GenericModal implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() modalTitle: string = "Modal Dialog";
  @Input() cssClass: string = "";
  @Input() closeOnBackdropClick: boolean = true;
  @Input() showDefaultFooter: boolean = false;
  @Input() showOkButton: boolean = true;
  @Input() okButtonText: string = 'OK';
  @Input() showCancelButton: boolean = true;
  @Input() cancelButtonText: string = 'Cancel';
  /** Optional muted text pinned to the left of the footer (e.g. "Last updated …"). */
  @Input() footerNote: string = '';
  @Input() modalComponent?: Type<any>;
  @Input() modalComponentData?: any;

  @Output() isVisibleChanged = new EventEmitter<boolean>();
  @Output() modalClosed = new EventEmitter<void>();
  @Output() modalOpened = new EventEmitter<void>();
  @Output() modalResult = new EventEmitter<any>();
  @Output() modalCancelled = new EventEmitter<void>();

  @ContentChild('bodyContent', { read: TemplateRef }) bodyContentTemplate?: TemplateRef<any>;
  @ContentChild('[slot=footer]', { read: TemplateRef }) footerContentTemplate?: TemplateRef<any>;
  @ViewChild('modalContainer', { read: ViewContainerRef, static: false }) modalContainer!: ViewContainerRef;

  private originalBodyOverflow: string = '';
  private componentRef: ComponentRef<any> | null = null;

  ngOnInit() {
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
    if (this.isVisible) {
      this.restoreBodyScroll();
      // Destroyed while still open (route change, parent @if): without this the
      // flag stays on <body> and keeps suppressing chrome for the whole session.
      document.body.classList.remove('modal-open');
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('Modal ngOnChanges:', changes);
    console.log('Current isVisible value:', this.isVisible);
    console.log('Modal component:', this.modalComponent);

    if (changes['isVisible']) {
      console.log('Visibility changed from', changes['isVisible'].previousValue, 'to', changes['isVisible'].currentValue);

      if (this.isVisible) {
        console.log('Opening modal...');
        this.handleModalOpen();
        setTimeout(() => {
          if (this.modalComponent) {
            console.log('Loading component:', this.modalComponent.name);
            this.loadComponent();
          } else {
            console.log('No modal component to load');
          }
        }, 300);
      } else {
        console.log('Closing modal...');
        if (this.componentRef) {
          this.componentRef.destroy();
          this.componentRef = null;
        }
        this.handleModalClose();
      }
    }

    if (changes['modalComponent'] && this.isVisible && this.modalComponent) {
      console.log('Modal component changed while modal is open');
      setTimeout(() => {
        this.loadComponent();
      }, 0);
    }

    if (changes['modalComponentData'] && this.componentRef?.instance) {
      this.assignComponentData(changes['modalComponentData'].currentValue);
    }
  }

  get hasFooterContent(): boolean {
    return this.showDefaultFooter || !!this.footerContentTemplate;
  }

  get hasCustomFooter(): boolean {
    return !!this.footerContentTemplate;
  }

  openModal(): void {
    if (!this.isVisible) {
      this.isVisible = true;
      this.handleModalOpen();
    }
  }

  closeModal(): void {
    if (this.isVisible) {
      this.isVisible = false;
      this.handleModalClose();
    }
  }

  private handleModalOpen(): void {
    this.preventBodyScroll();
    document.body.classList.add('modal-open');
    console.log('✅ Added modal-open class to body');
    console.log('Body classes:', document.body.className);
    this.isVisibleChanged.emit(true);
    this.modalOpened.emit();

    setTimeout(() => {
      const closeButton = document.querySelector('.btn-close') as HTMLElement;
      closeButton?.focus();
    }, 150);
  }

  private handleModalClose(): void {
    this.restoreBodyScroll();
    document.body.classList.remove('modal-open');
    console.log('✅ Removed modal-open class from body');
    console.log('Body classes:', document.body.className);
    this.isVisibleChanged.emit(false);
    this.modalClosed.emit();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdropClick) {
      this.onCancelClick();
    }
  }

  private handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isVisible) {
      this.onCancelClick();
    }
  }

  onOkClick(): void {
    try {
      let result: any = true;

      if (this.componentRef && this.componentRef.instance) {
        const inst: any = this.componentRef.instance;

        if (typeof inst.getModalResult === 'function') {
          result = inst.getModalResult();
        } else if (inst.frmGroup && typeof inst.frmGroup.getRawValue === 'function') {
          result = inst.frmGroup.getRawValue();
        }
      }

      // child explicitly said: do not close
      if (result === false) {
        return;
      }

      // optional flexible contract
      if (result && typeof result === 'object' && result.close === false) {
        return;
      }

      this.modalResult.emit(result);

      // only close if child allows closing
      this.closeModal();

    } catch (e) {
      console.warn('OK click: failed to collect child result', e);
      // error hole auto close korben na
    }
  }


  onCancelClick(): void {
    try {
      this.modalCancelled.emit();
    } catch (e) {
      console.warn('Cancel click: error emitting cancel', e);
    }
    this.closeModal();
  }

  // onCancelClick(): void {
  //   try {
  //     let result: any = true;
  //     if (this.componentRef && this.componentRef.instance) {
  //       const inst: any = this.componentRef.instance;
  //       // Prefer an explicit getter if provided by child
  //       if (typeof inst.getModalResult === 'function') {
  //         result = inst.getModalResult();
  //       } else if (inst.frmGroup && typeof inst.frmGroup.getRawValue === 'function') {
  //         // Common pattern: child exposes a FormGroup named frmGroup
  //         result = inst.frmGroup.getRawValue();
  //       }
  //     }
  //     this.modalResult.emit(result);
  //   } catch (e) {
  //     console.warn('OK click: failed to collect child result, emitting true', e);
  //     this.modalResult.emit(true);
  //   }
  //   this.closeModal();
  // }

  private loadComponent(retryCount: number = 0) {
    console.log(`=== LOADING COMPONENT (Attempt ${retryCount + 1}) ===`);
    console.log('Modal Container:', this.modalContainer);
    console.log('Modal Component:', this.modalComponent);
    console.log('Modal Component Data:', this.modalComponentData);

    if (!this.modalContainer) {
      console.error('Modal container not found!');

      if (retryCount < 3) {
        console.log(`Retrying in ${(retryCount + 1) * 200}ms...`);
        setTimeout(() => {
          this.loadComponent(retryCount + 1);
        }, (retryCount + 1) * 200);
      } else {
        console.error('Failed to find modal container after 3 retries');
        this.addFallbackContent();
      }
      return;
    }

    if (!this.modalComponent) {
      console.error('No modal component specified!');
      return;
    }

    try {
      this.modalContainer.clear();

      console.log('Creating component...');
      this.componentRef = this.modalContainer.createComponent(this.modalComponent);

      console.log('Component created successfully:', this.componentRef);
      console.log('Component instance:', this.componentRef.instance);

      this.assignComponentData(this.modalComponentData);

      this.componentRef.changeDetectorRef.detectChanges();

      console.log('✅ Component loaded successfully');
      console.log('Component element:', this.componentRef.location.nativeElement);

      // Provide the modalParent API to the child component so it can close the modal
      try {
        if (this.componentRef && this.componentRef.instance) {
          // assign a small API object the child can call
          this.componentRef.instance.modalParent = {
            close: (result?: any) => {
              // emit result and close modal
              this.modalResult.emit(result);
              this.closeModal();
            },
            closeModal: () => this.closeModal()
          };
        }
      } catch (err) {
        console.warn('Could not assign modalParent to child instance', err);
      }

      // Auto-subscribe to any EventEmitter-like outputs on the child instance and forward
      try {
        const inst = this.componentRef.instance as any;
        if (inst) {
          Object.keys(inst).forEach(key => {
            const prop = inst[key];
            // detect EventEmitter-like objects (has subscribe and emit functions)
            if (prop && typeof prop.subscribe === 'function' && typeof prop.emit === 'function') {
              try {
                prop.subscribe((value: any) => {
                  // Forward child's emitted value — emit raw value for simplicity
                  this.modalResult.emit(value);
                });
              } catch (subErr) {
                console.warn(`Failed to subscribe to child output ${key}:`, subErr);
              }
            }
          });
        }
      } catch (subAllErr) {
        console.warn('Error while subscribing to child outputs', subAllErr);
      }

    } catch (error) {
      console.error('❌ Error loading component:', error);
      this.addErrorContent(error);
    }
  }

  private addFallbackContent() {
    if (this.modalContainer) {
      this.modalContainer.clear();

      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 2rem; text-align: center; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border: 2px solid #cbd5e1; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="width: 64px; height: 64px; margin: 0 auto 1rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h4 style="color: #1e293b; margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 700;">Component Loading Error</h4>
          <p style="color: #475569; margin: 0 0 0.25rem;">Unable to load: <strong>${this.modalComponent?.name || 'Unknown'}</strong></p>
          <p style="font-size: 0.875rem; color: #64748b; margin: 0;">The modal container could not be initialized properly.</p>
        </div>
      `;

      if (this.modalContainer.element?.nativeElement) {
        this.modalContainer.element.nativeElement.appendChild(element);
      }
    }
  }

  private addErrorContent(error: any) {
    if (this.modalContainer) {
      this.modalContainer.clear();

      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 2rem; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #fca5a5; border-radius: 16px; color: #991b1b; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="width: 48px; height: 48px; background: #ef4444; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h4 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Component Loading Failed</h4>
          </div>
          <p style="margin: 0 0 0.5rem;"><strong>Component:</strong> ${this.modalComponent?.name || 'Unknown'}</p>
          <p style="margin: 0 0 1rem;"><strong>Error:</strong> ${error.message || error}</p>
          <details style="background: white; padding: 1rem; border-radius: 8px; cursor: pointer;">
            <summary style="font-weight: 600; color: #dc2626;">View Error Details</summary>
            <pre style="margin: 0.75rem 0 0; padding: 0.75rem; background: #fef2f2; border-radius: 6px; font-size: 0.75rem; overflow-x: auto; color: #7f1d1d; border: 1px solid #fecaca;">${error.stack || error}</pre>
          </details>
        </div>
      `;

      if (this.modalContainer.element?.nativeElement) {
        this.modalContainer.element.nativeElement.appendChild(element);
      }
    }
  }

  private assignComponentData(data: any): void {
    if (!data || !this.componentRef?.instance) {
      return;
    }

    const instance = this.componentRef.instance as any;

    const assignValue = (key: string, value: any) => {
      if (typeof this.componentRef!.setInput === 'function') {
        this.componentRef!.setInput(key, value);
      } else {
        instance[key] = value;
      }
    };

    if ('modalComponentData' in instance) {
      assignValue('modalComponentData', data);
    } else {
      Object.entries(data).forEach(([key, value]) => {
        if (key in instance) {
          assignValue(key, value);
        }
      });
    }

    this.componentRef.changeDetectorRef.detectChanges();
    console.log('Data assigned to component:', data);
  }

  private preventBodyScroll(): void {
    this.originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private restoreBodyScroll(): void {
    document.body.style.overflow = this.originalBodyOverflow;
  }
}
