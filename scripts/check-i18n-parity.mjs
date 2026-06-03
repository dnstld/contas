#!/usr/bin/env node
/**
 * Verifies that every locale under `i18n/locales/` exposes the same set of
 * translation keys. A missing key in pt-BR would silently fall back to English
 * at runtime (i18next default behavior) — that drift is invisible unless we
 * compare schemas explicitly. Run via `pnpm i18n:check`.
 *
 * Exits with code 1 (and a per-locale diff) if any locale is missing keys
 * present in another, OR has keys that no other locale has.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'i18n', 'locales');

function collectKeys(obj, prefix = '') {
  const out = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    out.push(prefix);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    out.push(...collectKeys(v, next));
  }
  return out;
}

function loadLocale(file) {
  const raw = readFileSync(join(LOCALES_DIR, file), 'utf8');
  return JSON.parse(raw);
}

const files = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();
if (files.length < 2) {
  console.log(`Only ${files.length} locale file(s) found — nothing to compare.`);
  process.exit(0);
}

const keysByLocale = new Map();
for (const file of files) {
  keysByLocale.set(file, new Set(collectKeys(loadLocale(file))));
}

const allKeys = new Set();
for (const set of keysByLocale.values()) {
  for (const key of set) allKeys.add(key);
}

let hasDiff = false;
for (const [file, keys] of keysByLocale) {
  const missing = [...allKeys].filter((k) => !keys.has(k)).sort();
  if (missing.length > 0) {
    hasDiff = true;
    console.error(`\n${file} is missing ${missing.length} key(s):`);
    for (const k of missing) console.error(`  - ${k}`);
  }
}

if (hasDiff) {
  console.error('\ni18n locales are out of sync. Add the missing keys (or remove the extras).');
  process.exit(1);
}

console.log(`✓ All ${files.length} locale files have matching keys (${allKeys.size} total).`);
