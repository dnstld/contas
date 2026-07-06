/**
 * Calculator-style amount entry.
 *
 * Shared by every editable money field (the transaction amount and the category
 * monthly-goal input) so they behave identically while typing. The field shows
 * a formatted mask (e.g. "0,00") over an integer-cents value; an edit to that
 * text is interpreted as digit additions/removals on the underlying value,
 * regardless of cursor position. Without this, typing "5" at the start of
 * "0,00" would turn the mask's trailing zeros into entered digits
 * (e.g. "50,00" → 5000 cents instead of 5).
 *
 * @param currentCents     the current value, in integer cents
 * @param currentFormatted the currently displayed formatted string (the mask)
 * @param nextText         the field's proposed new text from onChangeText
 * @returns the next value in integer cents
 */
export function nextAmountCents(
  currentCents: number,
  currentFormatted: string,
  nextText: string,
): number {
  const newDigits = nextText.replace(/\D/g, '');
  const prevDigits = currentFormatted.replace(/\D/g, '');
  if (newDigits === prevDigits) return currentCents;

  if (newDigits.length > prevDigits.length) {
    // Digits added: find where they diverge and shift them in from the right.
    let diffIdx = 0;
    while (diffIdx < prevDigits.length && prevDigits[diffIdx] === newDigits[diffIdx]) {
      diffIdx += 1;
    }
    const addedCount = newDigits.length - prevDigits.length;
    const addedChars = newDigits.slice(diffIdx, diffIdx + addedCount);
    let next = currentCents;
    for (const ch of addedChars) {
      next = next * 10 + Number(ch);
    }
    return next;
  }

  if (newDigits.length < prevDigits.length) {
    // Digits removed: drop the low-order digits (backspace behaviour).
    const removedCount = prevDigits.length - newDigits.length;
    let next = currentCents;
    for (let i = 0; i < removedCount; i += 1) {
      next = Math.floor(next / 10);
    }
    return next;
  }

  // Same length but different content (e.g. an in-place replace): reparse.
  const parsed = Number.parseInt(newDigits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
