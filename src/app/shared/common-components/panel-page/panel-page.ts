import {
  Component,
  Directive,
  EventEmitter,
  Input,
  Output,
  contentChild,
} from '@angular/core';
import { CasePanelHeaderComponent } from '../case-quick-view/case-panel-header/case-panel-header.component';

/** Marks projected content as the panel's fixed sub-header (stats bar / banner). */
@Directive({ selector: '[panelSubheader]', standalone: true })
export class PanelSubheaderDirective {}

/** Marks projected content as the panel's fixed footer action bar. */
@Directive({ selector: '[panelFooter]', standalone: true })
export class PanelFooterDirective {}

/**
 * Standard shell for pages that open in the right detail panel.
 *
 * Owns the scrolling-body / fixed-footer scaffold so individual pages never
 * repeat the scroll utility classes. Change scroll behaviour for every panel
 * page by editing this one component.
 *
 * The title/close header is OFF by default: pages opened in a workspace with
 * `managedPanelHeader` get their header from the workspace (rendered once, above
 * the router-outlet). Set `[showHeader]="true"` only for standalone usage where
 * this component must draw its own header.
 *
 * Usage (inside a managed workspace — no header, no per-page title/close):
 *   <app-panel-page bodyClass="p-5 space-y-3 pb-20">
 *     <!-- optional fixed sub-header -->
 *     <div panelSubheader class="... flex-shrink-0">...</div>
 *
 *     <!-- scrollable body: everything not marked as sub-header/footer -->
 *     ...content...
 *
 *     <!-- optional fixed footer -->
 *     <ng-container panelFooter>
 *       <button ...>Cancel</button>
 *       <button ...>Save</button>
 *     </ng-container>
 *   </app-panel-page>
 */
@Component({
  selector: 'app-panel-page',
  standalone: true,
  imports: [CasePanelHeaderComponent],
  template: `
    <div class="w-full h-full flex flex-col min-h-0 bg-white overflow-hidden">
      @if (showHeader) {
        <case-panel-header
          [title]="title"
          [subtitle]="subtitle"
          [actionVisible]="closable"
          (action)="close.emit()">
        </case-panel-header>
      }

      <!-- Optional fixed sub-header (stats bar / banner) -->
      <ng-content select="[panelSubheader]"></ng-content>

      <!-- Scrollable body -->
      <div [class]="'flex-1 min-h-0 overflow-y-auto scrollbar-none ' + bodyClass">
        <ng-content></ng-content>
      </div>

      <!-- Optional fixed footer -->
      @if (footer()) {
        <div [class]="'bg-slate-50 border-t border-slate-100 flex-shrink-0 p-3 ' + footerClass">
          <ng-content select="[panelFooter]"></ng-content>
        </div>
      }
    </div>
  `,
  styles: [`
    .scrollbar-none { scrollbar-width: none; }
    .scrollbar-none::-webkit-scrollbar { display: none; }
  `],
})
export class PanelPageComponent {
  /** Draw this component's own title/close header. Off by default — the workspace owns it. */
  @Input() showHeader = false;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() closable = true;

  /**
   * Padding / spacing utilities for the scroll body. The scroll mechanics
   * (flex-1 min-h-0 overflow-y-auto scrollbar-none) are always applied on top.
   */
  @Input() bodyClass = 'p-5 space-y-4 pb-20';

  /** Layout utilities for the footer bar. Base chrome (bg/border/padding) is always applied. */
  @Input() footerClass = 'flex items-center justify-end gap-2.5';

  @Output() close = new EventEmitter<void>();

  /** Present only when a [panelFooter] element is projected. */
  footer = contentChild(PanelFooterDirective);
}
