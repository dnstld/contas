/**
 * Single source of truth for locale-aware formatting.
 *
 * Pure functions — every `Intl.NumberFormat`/`Intl.DateTimeFormat` in the app
 * goes through here. Leaf atoms take `locale`/`currency` as props (atomic
 * layering forbids them from reading `useWallet`/`useFormatters`) and call
 * these directly; components use the `useFormatters()` hook, which binds these
 * to the active locale/currency.
 */

export interface CurrencyFormatOptions {
  /** Minimum and maximum fraction digits (they're kept equal). Default 2. */
  fractionDigits?: number;
  signDisplay?: Intl.NumberFormatOptions['signDisplay'];
}

export function formatCurrency(
  value: number,
  currency: string,
  locale: string,
  options?: CurrencyFormatOptions,
): string {
  const digits = options?.fractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: options?.signDisplay ?? 'auto',
  }).format(value);
}

export function formatPercent(
  value: number,
  locale: string,
  options?: { signDisplay?: Intl.NumberFormatOptions['signDisplay'] },
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    signDisplay: options?.signDisplay ?? 'auto',
  }).format(value);
}

/** Decimal with 2 fraction digits by default; `options` can override. */
export function formatDecimal(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * The currency's symbol (e.g. `R$`, `$`, `€`). Hermes' `Intl` doesn't ship
 * `formatToParts`, so derive it by formatting 0 with no fraction digits and
 * stripping digits + whitespace (incl. non-breaking).
 */
export function currencySymbol(currency: string, locale: string): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0);
  return formatted.replace(/[\s\d]/g, '').trim();
}

export function monthName(
  monthIndex0: number,
  locale: string,
  style: 'long' | 'short' = 'long',
): string {
  return new Intl.DateTimeFormat(locale, { month: style }).format(new Date(2024, monthIndex0, 1));
}

/** Thin one-shot wrapper so all `Intl.DateTimeFormat` usage has one home. */
export function formatDate(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export interface RelativeDateLabels {
  today: string;
  yesterday: string;
}

/**
 * Single source of truth for the "Today" / "Yesterday" / "<day> <month>" /
 * "<day> <month> <year>" relative-date label used across the app (the
 * Transactions section headers and the Balance card's last-update line).
 * Comparisons use the calendar day in local time, not elapsed hours.
 */
export function formatRelativeDate(
  date: Date,
  now: Date,
  locale: string,
  labels: RelativeDateLabels,
): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);
  const yesterday = startOfDay(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = startOfDay(date);

  if (target.getTime() === today.getTime()) return labels.today;
  if (target.getTime() === yesterday.getTime()) return labels.yesterday;

  return target.getFullYear() === today.getFullYear()
    ? formatDate(date, locale, { day: 'numeric', month: 'long' })
    : formatDate(date, locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
