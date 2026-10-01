import { describe, expect, it } from 'vitest';
import {
  addRoleApproval,
  approveStep,
  canApproveStep,
  canResume,
  isStubMfaCode,
  nextStep,
} from './approval';
import type { ApprovalStep } from './types';

const at = '2026-09-30T08:00:00.000Z';

describe('resume after kill switch', () => {
  it('needs two distinct roles', () => {
    const first = addRoleApproval([], { role: 'Incident commander', by: 'A', at });
    expect(first.ok).toBe(true);
    expect(canResume(first.approvals)).toBe(false);
    const second = addRoleApproval(first.approvals, { role: 'Compliance Lead', by: 'B', at });
    expect(second.ok).toBe(true);
    expect(canResume(second.approvals)).toBe(true);
  });

  it('rejects the same role twice with a message', () => {
    const first = addRoleApproval([], { role: 'Compliance Lead', by: 'A', at });
    const again = addRoleApproval(first.approvals, { role: 'Compliance Lead', by: 'C', at });
    expect(again.ok).toBe(false);
    expect(again.ok ? '' : again.error).toMatch(/already approved/);
    expect(again.approvals).toHaveLength(1);
  });
});

it('accepts any six digits as the stub MFA code', () => {
  expect(isStubMfaCode('123456')).toBe(true);
  expect(isStubMfaCode(' 000000 ')).toBe(true);
  expect(isStubMfaCode('12345')).toBe(false);
  expect(isStubMfaCode('12a456')).toBe(false);
});

describe('approval chain order', () => {
  const chain: ApprovalStep[] = [
    { role: 'Drafter', personId: 'a', approvedAt: at },
    { role: 'Compliance Lead', personId: 'b' },
    { role: 'CEO', personId: 'c' },
  ];

  it('only allows the next step', () => {
    expect(nextStep(chain)).toBe(1);
    expect(canApproveStep(chain, 1)).toBe(true);
    expect(canApproveStep(chain, 2)).toBe(false);
    expect(canApproveStep(chain, 0)).toBe(false);
    expect(() => approveStep(chain, 2, at)).toThrow(/before/);
  });

  it('approves in order until done', () => {
    const done = approveStep(approveStep(chain, 1, at), 2, at);
    expect(nextStep(done)).toBe(-1);
    expect(canApproveStep(done, -1)).toBe(false);
  });
});
