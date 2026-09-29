// form-control-highlight.directive.ts
import { Directive, ElementRef, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { FormControlName } from '@angular/forms';
import { Subscription, map, distinctUntilChanged } from 'rxjs';
import { HighlightService } from '../services/highlight.service';

@Directive({
    selector: '[formControlName]',
    standalone: true
})
export class FormControlHighlightDirective implements OnInit, OnDestroy {
    private sub?: Subscription;
    private hostEl: HTMLElement;
    private candidateKeys: string[] = [];

    private readonly HIGHLIGHT_CLASS = 'isHighlight';
    private readonly FONT_CLASS = 'font-semibold';

    constructor(
        el: ElementRef<HTMLElement>,
        private renderer: Renderer2,
        private fcName: FormControlName,
        private highlight: HighlightService
    ) { this.hostEl = el.nativeElement; }

    ngOnInit(): void {
        // compute candidate keys once (cheap) and reuse
        this.candidateKeys = this.computeCandidateKeys();

        // subscribe to the map$ and only react when the boolean "is highlighted" for this control changes
        this.sub = this.highlight.map$
            .pipe(
                map(m => this.candidateKeys.some(k => !!m[k])),
                distinctUntilChanged()
            )
            .subscribe(isOn => this.apply(isOn));

        // initial run in microtask to ensure DOM is ready
        queueMicrotask(() => {
            // in case the service already had a map before subscription, run initial apply
            const current = (this.highlight as any).mapSubject?.getValue?.() ?? {}; // fallback safe read
            const isOn = this.candidateKeys.some(k => !!current[k]);
            this.apply(isOn);
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    private apply(should: boolean): void {
        const target = this.findTarget();
        if (should) {
            this.renderer.addClass(target, this.HIGHLIGHT_CLASS);
            this.renderer.addClass(target, this.FONT_CLASS);
        }
    }

    private computeCandidateKeys(): string[] {
        const out = new Set<string>();
        const simple = this.fcName.name?.toString() ?? '';
        const pathArr = (this.fcName.path ?? []).map(String);
        if (simple) out.add(simple);
        if (pathArr.length) {
            out.add(pathArr.join('.'));               // full dotted path (maybe includes leaf)
            out.add(this.toBracketNotation(pathArr)); // bracket path
        }
        if (this.isNumeric(simple) && pathArr.length >= 1) {
            const parent = pathArr.slice(0, -1);
            if (parent.length) {
                out.add(`${parent.join('.')}.${simple}`); // parent.0 or parent.some.0
                out.add(`${this.toBracketNotation(parent)}.${simple}`); // parent[0]
                out.add(this.toBracketNotation(parent.concat([simple]))); // parent[0].maybeLeaf
            }
        }
        // DOM prefixes: walk up parents and read data-hl-prefix attributes.
        // For each prefix chain, add prefix + all above variants.
        const prefixes = this.collectDomPrefixes(); // e.g. ['user', 'billing']
        if (prefixes.length) {
            // build prefix chain e.g. 'user', 'user.billing', ...
            let chain = '';
            for (const p of prefixes) {
                chain = chain ? `${chain}.${p}` : p;
                if (simple) out.add(`${chain}.${simple}`);
                if (pathArr.length) {
                    out.add(`${chain}.${pathArr.join('.')}`);
                    out.add(`${chain}.${this.toBracketNotation(pathArr)}`);
                }
            }
        }
        return Array.from(out);
    }

    private toBracketNotation(parts: string[]): string {
        // convert ['addresses','0','postCode'] -> 'addresses[0].postCode'
        if (!parts.length) return '';
        const result: string[] = [];
        for (let i = 0; i < parts.length; i++) {
            const seg = parts[i];
            if (i === 0) {
                result.push(seg); // first segment stays
            } else if (this.isNumeric(seg)) {
                // convert previous segment to bracket form
                const prev = result.pop()!;
                result.push(`${prev}[${seg}]`);
            } else {
                result.push(seg);
            }
        }
        return result.join('.');
    }

    private collectDomPrefixes(): string[] {
        const res: string[] = [];
        let node: HTMLElement | null = this.hostEl.parentElement;
        // walk upward to collect prefixes nearest-first (so chain builds outer->inner)
        const temp: string[] = [];
        while (node) {
            const attr = node.getAttribute('data-hl-prefix');
            if (attr) temp.unshift(attr); // unshift so outermost prefix becomes first in chain
            node = node.parentElement;
        }
        // return in order outermost -> innermost (so building chain 'outer.inner' is easy)
        return temp;
    }

    private findTarget(): HTMLElement {
        const mat = this.hostEl.closest('mat-form-field') as HTMLElement | null;
        return mat ?? this.hostEl;
    }

    private isNumeric(s: string): boolean {
        return /^\d+$/.test(s);
    }
}
