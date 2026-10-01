import type { ApprovalStep } from './types';

export interface RoleApproval {
  role: string;
  by: string;
  at: string;
}

export type ApprovalResult =
  { ok: true; approvals: RoleApproval[] } | { ok: false; error: string; approvals: RoleApproval[] };

/** Approvals from this many distinct roles are needed to resume after a kill switch. */
export const RESUME_ROLES_NEEDED = 2;

/** Adds an approval; a second approval from a role that already approved is rejected. */
export function addRoleApproval(approvals: RoleApproval[], next: RoleApproval): ApprovalResult {
  if (approvals.some((a) => a.role === next.role)) {
    return {
      ok: false,
      error: `${next.role} has already approved. The second approval must come from a different role.`,
      approvals,
    };
  }
  return { ok: true, approvals: [...approvals, next] };
}

export function canResume(approvals: RoleApproval[]): boolean {
  return new Set(approvals.map((a) => a.role)).size >= RESUME_ROLES_NEEDED;
}

/** The MFA step is a stub: any six digits pass. */
export function isStubMfaCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/** Index of the first step of an approval chain still waiting, or -1 when all approved. */
export function nextStep(chain: ApprovalStep[]): number {
  return chain.findIndex((s) => !s.approvedAt);
}

/** A step can be approved only after every step before it. */
export function canApproveStep(chain: ApprovalStep[], index: number): boolean {
  return index >= 0 && index === nextStep(chain);
}

export function approveStep(chain: ApprovalStep[], index: number, at: string): ApprovalStep[] {
  if (!canApproveStep(chain, index)) {
    throw new Error(`Step ${index + 1} cannot be approved before the steps before it.`);
  }
  return chain.map((s, i) => (i === index ? { ...s, approvedAt: at } : s));
}
