import {
  Component,
  EnvironmentInjector,
  ViewChild,
  ViewContainerRef,
  AfterViewInit,
  OnInit,
  inject,
  WritableSignal,
  signal,
  ChangeDetectorRef,
  ElementRef,
  NgZone,
  OnDestroy
} from '@angular/core';
import { ComponentRegistry } from '../component-registry';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

import { ToastrService } from 'ngx-toastr';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApprovalService } from '../../../services/approval-service';
import { HighlightService } from '../../../services/highlight.service';
import { BUTTON_VISIBILITY } from '../../../constant/button-signals.constant';
import { ExpansionPanelHeader } from '../../../common-components/expansion-panel-header/expansion-panel-header';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';
import { InputTextBox } from '../../../common-components/input-types/input-text-box/input-text-box';
import { ApprovalRequest } from '../../../models/approval';
import { GenericButton } from '../../../common-components/generic-component-type/generic-button/generic-button';
import { UserService } from '../../../../core/user/user.service';
import { User } from '../../../../core/user/user.types';

type DiffMap = Record<string, boolean>;

@Component({
    selector: 'app-approval-movement',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIcon, ExpansionPanelHeader, GenericButton, InputTextBox],
    templateUrl: './approval-movement.html',
    styleUrl: './approval-movement.scss'
})
export class ApprovalMovement implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('dynamicHostLeft', { read: ViewContainerRef, static: false })
    private hostLeft!: ViewContainerRef;

    @ViewChild('dynamicHostRight', { read: ViewContainerRef, static: false })
    private hostRight!: ViewContainerRef;

    @ViewChild('leftPane') private leftPane?: ElementRef<HTMLDivElement>;
    @ViewChild('rightPane') private rightPane?: ElementRef<HTMLDivElement>;

    /** Pane the user is currently dragging; see linkPaneScrolling(). */
    private scrollDriver: HTMLElement | null = null;
    private paneScrollTeardown: Array<() => void> = [];
    toastr = inject(ToastrService);
    data: any;
    private diffMap: DiffMap = {};
    private setId: number;
    private approvalRequest: ApprovalRequest;
    userId: string = '';
    officeId: string = '';
    /** Backs the <input-text-box> in the action bar; required so the control
     *  renders its own asterisk and "Remarks is required..!" message. */
    remarksForm = new FormGroup({
        remarks: new FormControl('')
    });

    /** Trimmed control value; '' when untouched, so the empty checks below read
     *  the same as they did against the old rejectReason field. */
    get remarks(): string {
        return (this.remarksForm.get('remarks')?.value ?? '').trim();
    }

    businessHeaderPanel: WritableSignal<boolean> = signal(true);
    constructor(
        private registry: ComponentRegistry,
        private env: EnvironmentInjector,
        private approvalService: ApprovalService,
        private router: Router,
        private location: Location,
        private hl: HighlightService,
        private userService: UserService,
        private zone: NgZone
    ) {
        const nav = this.router.getCurrentNavigation();
        this.data = nav?.extras.state?.['data'] || null;

        BUTTON_VISIBILITY.set({
            save: false,
            update: false,
            view: false,
            delete: false,
            exit: false,
            reset: false
        });
    }

    ngOnInit(): void {
        if (!this.data) return;

        if (typeof this.data === 'string') {
            try {
                this.data = JSON.parse(this.data);
                console.log(' Parsed data from string:', this.data);
            } catch (e) {
                console.error(' Invalid JSON in router state:', e);
                return;
            }
        }

         this.userService.user$.subscribe((user: User) => {
              this.userId = user.username;
              this.officeId = user.officeId;
            });

        this.setId = this.data.setId;

        console.log('user id : ', this.userId);
        console.log('data line movement : ', this.data);
        this.data.currentUxContent = this.data.currentContext || this.safeParse(this.data.currentUxContent);
        this.data.previousUxContent = this.data.previousContext || this.safeParse(this.data.previousUxContent);
        console.log('data line currentUxContent : ', this.data.currentUxContent) ;
        console.log('data line previousUxContent : ', this.data.previousUxContent );
        if (this.data?.currentUxContent) {
            this.diffMap = buildDiffMap(this.data.previousUxContent, this.data.currentUxContent, []);
        }
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.renderBoth();
            this.linkPaneScrolling();
        });
    }

    ngOnDestroy(): void {
        this.paneScrollTeardown.forEach(off => off());
        this.paneScrollTeardown = [];
    }

    /**
     * Mirrors the two comparison panes horizontally, GitHub side-by-side style:
     * dragging either bar moves the other by the same amount, so a field and its
     * previous value never drift onto different screen columns.
     *
     * No-ops in the single-pane view, where #rightPane is not rendered.
     */
   private linkPaneScrolling(): void {
    const left = this.leftPane?.nativeElement;
    const right = this.rightPane?.nativeElement;
    if (!left || !right) return;

    // Mirroring only writes scrollLeft/scrollTop, so it needs no change detection.
    // Listening outside Angular keeps a drag from firing a CD pass per event.
    this.zone.runOutsideAngular(() => {
        const mirror = (source: HTMLElement, target: HTMLElement) => {
            const onScroll = () => {
                // Writing scrollLeft/scrollTop makes the target emit its own scroll event.
                // Tracking which pane the user is actually driving stops the two
                // from echoing each other and fighting over the position.
                if (this.scrollDriver && this.scrollDriver !== source) return;
                this.scrollDriver = source;
                target.scrollLeft = source.scrollLeft;
                target.scrollTop = source.scrollTop;
                // Released next frame: by then the echo has been swallowed, and
                // the other pane is free to take over as driver.
                requestAnimationFrame(() => (this.scrollDriver = null));
            };

            source.addEventListener('scroll', onScroll, { passive: true });
            this.paneScrollTeardown.push(() => source.removeEventListener('scroll', onScroll));
        };

        mirror(left, right);
        mirror(right, left);
    });
}
    // Safe parser helper
    safeParse(value: any): any {
        if (!value) return {};
        if (typeof value === 'object') return value;
        try {
            return JSON.parse(value);
        } catch (e) {
            console.warn('Failed to parse JSON:', value, e);
            return {};
        }
    }
    // approval-movement.component.ts

    // approval-movement.component.ts

    // approval-movement.component.ts

    private renderBoth(): void {
        if (!this.data) return;

        // Parse JSON if needed
        if (typeof this.data.currentUxContent === 'string') {
            this.data.currentUxContent = JSON.parse(this.data.currentUxContent);
        }
        if (typeof this.data.previousUxContent === 'string') {
            this.data.previousUxContent = JSON.parse(this.data.previousUxContent);
        }

        // Compute diff map
        const diffMap = buildDiffMap(
            this.data.previousUxContent,
            this.data.currentUxContent,
            []
        );

        const isBothhost = !!(this.hostLeft && this.hostRight);

        // Render LEFT (Change Request) with highlightMap
        this.createInto(this.data.selector, this.hostLeft, this.data.currentUxContent, true, isBothhost, diffMap);

        // Render RIGHT (Previous) WITHOUT highlightMap
        if (this.hasPreviousContent() && this.hostRight) {
            const sel = this.data.previousUxContent.selector || this.data.selector;
            this.createInto(sel, this.hostRight, this.data.previousUxContent, isBothhost, true); // no map
        }
    }

   hasPreviousContent(): boolean {
        const prev = this.data?.previousUxContent;
        if (!prev) return false;
        // Treat empty objects/arrays as missing
        if (Array.isArray(prev)) {
            return prev.length > 0;
        }
        if (typeof prev === 'object') {
            return Object.keys(prev).length > 0;
        }
        return !!prev;
    }

    private createInto(
        selector: string,
        host: ViewContainerRef,
        data: any,
        isView: boolean,
        isBothhost: boolean,
        highlightMap?: Record<string, boolean> // optional
    ): void {
        const compType = this.registry.resolve(selector);
        if (!compType) return;

        host.clear();
        const ref = host.createComponent(compType, { environmentInjector: this.env });
        console.log(' viewObject : ', data);
        ref.setInput('viewObject', data);
        console.log(' isView : ', isView);
        ref.setInput('isViewDetails', isView);
        ref.setInput('isApprovalView', isBothhost);

        // Only pass highlightMap if provided
        if (highlightMap) {
            ref.setInput('highlightMap', highlightMap);
        }

        (ref.instance as any).viewData = data;
        (ref.instance as any).isView = isView;
        (ref.instance as any).isApprovalView = isBothhost;
        if (highlightMap) (ref.instance as any).highlightMap = highlightMap;

    }

    onApprove() {
        this.approvalService.performApprovalOperation({
            officeId: Number(this.officeId),
            appId: 1,
            setId: this.setId,
            approvalLevel: 0,
            nextApprovalLevel: 1,
            remarks: this.remarks,
            userId: this.userId,
            approvalFlag: 1
        }).subscribe({
            next: res => {
                this.toastr.success('Approved successfully');
                this.router.navigate(['/poc/approval-items']);
            },
            error: err => {
                console.error('Approval failed:', err);
                this.toastr.error('Approval Failed Due to : ', err.error.message);
            }
        });
    }
    onReject() {
        if (!this.remarks) {
            this.remarksForm.get('remarks')?.markAsTouched();
            this.toastr.warning('Remarks Required!');
        }
        else {
            this.approvalService.performApprovalOperation({
                officeId: Number(this.officeId),
                appId: 1,
                setId: this.setId,
                approvalLevel: 0,
                nextApprovalLevel: 1,
                remarks: this.remarks,
                userId: this.userId,
                approvalFlag: 2
            }).subscribe({
                next: res => {
                  this.toastr.error('Reject successfully');
                    this.router.navigate(['/poc/approval-items']);
                },
                error: err => {
                    console.error('Reject failed:', err);
                    this.toastr.error('Reject Failed Due to : ', err.error.message);

                }
            });
        }

    }

    onSendBack() {
        if (!this.remarks) {
            this.remarksForm.get('remarks')?.markAsTouched();
            this.toastr.warning('Remarks Required!');
        }
        else {
            this.approvalService.performApprovalOperation({
                officeId: Number(this.officeId),
                appId: 1,
                setId: this.setId,
                approvalLevel: 0,
                nextApprovalLevel: 1,
                remarks: this.remarks,
                userId: this.userId,
                approvalFlag: 3
            }).subscribe({
                next: res => {
                    console.log('Approval success:');
                    this.toastr.success('Approved successfully');
                    this.router.navigate(['/poc/approval-items']);
                },
                error: err => {
                    console.error('Approval failed:', err);
                    this.toastr.error('Approval Failed Due to : ', err);

                }
            });
        }

    }

    goBack() {
        this.location.back();
    }


}

/** Deep diff helper */
function buildDiffMap(
    a: any,
    b: any,
    ignorePaths: string[] = [],
    base: string = ''
): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    const ignore = new Set(ignorePaths);

    const isObj = (x: any) => x !== null && typeof x === 'object';
    const isArr = Array.isArray;
    const mark = (p: string) => !ignore.has(p) && (map[p] = true);

    const walk = (x: any, y: any, path: string) => {
        if (Object.is(x, y)) return;
        if (!isObj(x) || !isObj(y) || (isArr(x) !== isArr(y))) {
            mark(path);
            return;
        }
        if (isArr(x) && isArr(y)) {
            if (x.length !== y.length) {
                mark(path);
                return;
            }
            for (let i = 0; i < x.length; i++) walk(x[i], y[i], path ? `${path}[${i}]` : `[${i}]`);
            return;
        }
        const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
        for (const k of keys) {
            const child = path ? `${path}.${k}` : k;
            if (!(k in x) || !(k in y)) {
                mark(child);
                continue;
            }
            walk(x[k], y[k], child);
        }
    };

    walk(a, b, base);
    return map;
}
