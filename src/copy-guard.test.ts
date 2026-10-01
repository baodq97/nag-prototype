// Scans every source file and UI string for over-claiming wording. NAG supports compliance
// readiness and its records are tamper-evident; nothing may claim more than that.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const SELF = relative(ROOT, import.meta.filename);

const FORBIDDEN = [
  /tamper-proof/i,
  /fully compliant/i,
  /is compliant/i,
  /guarantees compliance/i,
  /zero false negatives/i,
  /certified compliant/i,
  /signed by NAG/i,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

it('finds no over-claiming wording in the source or UI text', () => {
  const scanned = [
    ...files(join(ROOT, 'src')),
    ...files(join(ROOT, 'e2e')),
    join(ROOT, 'index.html'),
  ]
    .map((path) => relative(ROOT, path))
    .filter((path) => path !== SELF);
  expect(scanned.length).toBeGreaterThan(20);
  const hits = scanned.flatMap((path) => {
    const text = readFileSync(join(ROOT, path), 'utf8');
    return FORBIDDEN.filter((re) => re.test(text)).map((re) => `${path}: ${re.source}`);
  });
  expect(hits).toEqual([]);
});
