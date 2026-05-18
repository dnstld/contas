/**
 * Apply an alpha channel to a hex colour.
 *
 * - Accepts `#RGB`, `#RRGGBB`, or `#RRGGBBAA`.
 * - `alpha` is a 0..1 fraction; any existing alpha in the input is replaced.
 * - Non-hex inputs (e.g. `rgba(...)`) are returned unchanged so callers can
 *   pass them through without special-casing.
 *
 * Prefer this over `colorString + 'AA'`-style concatenation: that breaks for
 * short-hex inputs and is opaque to readers.
 */
export function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;
  const clamped = Math.max(0, Math.min(1, alpha));
  const a = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');

  if (color.length === 4) {
    // #RGB → #RRGGBBAA
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}${a}`;
  }
  if (color.length === 7) {
    // #RRGGBB → #RRGGBBAA
    return `${color}${a}`;
  }
  if (color.length === 9) {
    // #RRGGBBAA → replace existing alpha
    return `${color.slice(0, 7)}${a}`;
  }
  return color;
}
