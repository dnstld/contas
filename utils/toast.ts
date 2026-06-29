type Burnt = typeof import('burnt');

let cached: Burnt | null | undefined;

function getBurnt(): Burnt | null {
  if (cached !== undefined) return cached;
  const registry = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo?.modules;
  if (!registry || !registry['Burnt']) {
    cached = null;
    return null;
  }
  try {
    cached = require('burnt') as Burnt;
  } catch {
    cached = null;
  }
  return cached;
}

function show(
  title: string,
  message: string | undefined,
  preset: 'done' | 'error' | 'none',
  haptic: 'success' | 'warning' | 'error' | 'none',
) {
  const burnt = getBurnt();
  if (!burnt) return;
  burnt.toast({ title, message, preset, haptic, duration: 2.5 });
}

export const toast = {
  success(title: string, message?: string) {
    show(title, message, 'done', 'success');
  },
  error(title: string, message?: string) {
    show(title, message, 'error', 'error');
  },
  info(title: string, message?: string) {
    show(title, message, 'none', 'none');
  },
};
