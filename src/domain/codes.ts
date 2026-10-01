import type { CodeId, DecisionCode } from './types';

// The decision and error codes NAG writes into evidence records and tool-call outcomes. Some
// only occur in situations the demo seed does not have, such as an active kill switch.

export const CODES: DecisionCode[] = [
  { id: 'NAG-D001', kind: 'decision', label: 'Allowed' },
  { id: 'NAG-D002', kind: 'decision', label: 'Blocked fail-closed' },
  { id: 'NAG-D003', kind: 'decision', label: 'Quarantined' },
  { id: 'NAG-D004', kind: 'decision', label: 'Kill switch active' },
  { id: 'NAG-D005', kind: 'decision', label: 'Review approved' },
  { id: 'NAG-D006', kind: 'decision', label: 'Review rejected' },
  { id: 'NAG-E001', kind: 'error', label: 'Key destroyed tombstone' },
  { id: 'NAG-E002', kind: 'error', label: 'Budget breach fail-open' },
  { id: 'NAG-E003', kind: 'error', label: 'NAG unreachable bypass' },
];

const byId = new Map(CODES.map((c) => [c.id, c]));

export function isCode(id: string): id is CodeId {
  return byId.has(id as CodeId);
}

export function getCode(id: CodeId): DecisionCode {
  const code = byId.get(id);
  if (!code) throw new Error(`Unknown code ${id}`);
  return code;
}

/** "Blocked fail-closed (NAG-D002)". */
export function codeText(id: CodeId): string {
  return `${getCode(id).label} (${id})`;
}
