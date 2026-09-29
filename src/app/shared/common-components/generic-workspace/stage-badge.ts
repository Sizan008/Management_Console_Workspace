// Shared, sharp stage-badge styling used by every workspace surface (generic
// workspace grid + search results) so a stage renders as the same legible chip
// everywhere. Each entry is a full chip: solid background + strong text + border.

// Normalized stage name → chip classes. Keyed on trimmed + lower-cased names so
// casing and the legacy "Submited" misspelling still resolve to the right colour.
const STAGE_BADGE_PALETTE: Record<string, string> = {
  submitted:   'bg-slate-100 text-slate-700 border border-slate-300',
  submited:    'bg-slate-100 text-slate-700 border border-slate-300', // legacy misspelling
  registered:  'bg-emerald-100 text-emerald-800 border border-emerald-300',
  'mail sent': 'bg-amber-100 text-amber-800 border border-amber-300',
  activated:   'bg-blue-100 text-blue-800 border border-blue-300',
  deactivated: 'bg-red-100 text-red-800 border border-red-300',
  approved:    'bg-emerald-100 text-emerald-800 border border-emerald-300',
  rejected:    'bg-red-100 text-red-800 border border-red-300',
  pending:     'bg-amber-100 text-amber-800 border border-amber-300',
};

// Neutral chip for any stage without a known colour — still a sharp, bordered pill.
export const NEUTRAL_STAGE_BADGE = 'bg-slate-100 text-slate-700 border border-slate-300';

const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();

/**
 * Sharp, legible chip classes for a stage badge.
 *
 * Prefers an API-supplied class only when it actually defines a background, so a
 * partial (text-colour-only) or empty value never renders as bare text. Otherwise
 * falls back to the built-in semantic palette, then a neutral chip.
 */
export function resolveStageBadge(stageName: unknown, apiClass?: string): string {
  const api = (apiClass ?? '').trim();
  if (api && /(^|\s)bg-/.test(api)) return api;
  return STAGE_BADGE_PALETTE[normalize(stageName)] ?? NEUTRAL_STAGE_BADGE;
}
