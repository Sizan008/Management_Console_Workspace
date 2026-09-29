/**
 * Positioning helper for dropdown menus that are rendered `position: fixed` so
 * they escape any ancestor `overflow: hidden` / stacking context.
 *
 * The catch: `position: fixed` is only viewport-relative when *no* ancestor
 * establishes a containing block. `transform`, `perspective`, `filter`,
 * `backdrop-filter`, `transform-style: preserve-3d`, `will-change` naming any of
 * those, and `contain: layout | paint` all establish one. Inside such an
 * ancestor (a modal with an entry animation being the usual culprit) a fixed
 * child is offset by that ancestor's padding-box corner, so a menu positioned
 * from raw viewport coordinates lands far away from its field.
 *
 * These helpers resolve the real containing block and express the menu's
 * coordinates relative to it, so the menu sits on its anchor either way.
 */

/** Padding-box rect of the containing block a fixed child resolves against. */
export interface ContainingBlockRect {
  left: number;
  top: number;
  bottom: number;
}

export interface AnchoredMenuOptions {
  /** Max height of the menu, used to decide whether it flips upward. */
  menuHeight: number;
  /** Gap between the field and the menu. */
  gap?: number;
  zIndex: string;
}

export interface AnchoredMenuPosition {
  style: { [key: string]: string };
  openUp: boolean;
}

const CONTAINING_BLOCK_WILL_CHANGE = /transform|perspective|filter/;
const CONTAINING_BLOCK_CONTAIN = /paint|layout|strict|content/;

function establishesContainingBlock(style: CSSStyleDeclaration): boolean {
  return (
    (style.transform && style.transform !== 'none') ||
    (style.perspective && style.perspective !== 'none') ||
    (style.filter && style.filter !== 'none') ||
    (style.backdropFilter && style.backdropFilter !== 'none') ||
    style.transformStyle === 'preserve-3d' ||
    CONTAINING_BLOCK_WILL_CHANGE.test(style.willChange || '') ||
    CONTAINING_BLOCK_CONTAIN.test(style.contain || '')
  );
}

/**
 * Walk up from `element` to the nearest ancestor that a `position: fixed`
 * descendant resolves against. Falls back to the viewport.
 */
export function getFixedContainingBlock(element: HTMLElement): ContainingBlockRect {
  let node = element.parentElement;

  while (node && node !== document.body && node !== document.documentElement) {
    const computed = getComputedStyle(node);
    if (establishesContainingBlock(computed)) {
      // A transformed ancestor's containing block is its *padding* box, but
      // getBoundingClientRect returns the border box — strip the borders.
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left + parseFloat(computed.borderLeftWidth || '0'),
        top: rect.top + parseFloat(computed.borderTopWidth || '0'),
        bottom: rect.bottom - parseFloat(computed.borderBottomWidth || '0'),
      };
    }
    node = node.parentElement;
  }

  return { left: 0, top: 0, bottom: window.innerHeight };
}

/**
 * Build the inline style for a fixed menu anchored under (or over) `anchor`.
 * The menu flips upward only when there is no room below but there is above.
 */
export function getAnchoredMenuPosition(
  anchor: HTMLElement,
  options: AnchoredMenuOptions
): AnchoredMenuPosition {
  const { menuHeight, zIndex } = options;
  const gap = options.gap ?? 4;

  const rect = anchor.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openUp = spaceBelow < menuHeight && spaceAbove >= menuHeight;

  const block = getFixedContainingBlock(anchor);

  const style: { [key: string]: string } = {
    position: 'fixed',
    left: `${rect.left - block.left}px`,
    width: `${rect.width}px`,
    right: 'auto',
    margin: '0',
    'z-index': zIndex,
  };

  if (openUp) {
    style['bottom'] = `${block.bottom - rect.top + gap}px`;
    style['top'] = 'auto';
  } else {
    style['top'] = `${rect.bottom + gap - block.top}px`;
    style['bottom'] = 'auto';
  }

  return { style, openUp };
}
