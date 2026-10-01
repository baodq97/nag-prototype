import {
  Archive,
  Bot,
  Cloud,
  Cpu,
  GitBranch,
  KeyRound,
  type LucideIcon,
  MessageSquare,
  Network,
  Radar,
  ShieldAlert,
  Stamp,
  Ticket,
  UserRoundCheck,
  Waypoints,
} from 'lucide-react';
import { Link } from 'react-router';
import { tests } from '../../data';
import type { Integration, IntegrationKind } from '../../domain/types';
import { dependentTests } from '../../domain/summaries';
import { fmtDateTime } from '../../ui/format';
import { StatusChip } from '../../ui/StatusChip';

/** One neutral icon per category; no vendor mark anywhere. */
const KIND_ICON: Record<IntegrationKind, LucideIcon> = {
  'ai-gateway': Waypoints,
  'agent-hooks': Bot,
  'mcp-inspector': Radar,
  'model-endpoint': Cpu,
  identity: UserRoundCheck,
  ticketing: Ticket,
  chat: MessageSquare,
  'key-management': KeyRound,
  'evidence-archive': Archive,
  'security-export': ShieldAlert,
  'timestamp-authority': Stamp,
  'source-repository': GitBranch,
  cloud: Cloud,
};

export function IconTile({ kind, size = 'md' }: { kind: IntegrationKind; size?: 'md' | 'lg' }) {
  const Icon = KIND_ICON[kind] ?? Network;
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200 ring-inset ${size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'}`}
    >
      <Icon size={size === 'lg' ? 22 : 18} />
    </span>
  );
}

export function CapabilityTags({ name, capabilities }: { name: string; capabilities: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label={`Capabilities of ${name}`}>
      {capabilities.map((c) => (
        <li
          key={c}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200 ring-inset"
        >
          {c}
        </li>
      ))}
    </ul>
  );
}

/**
 * What broke, since when, how to fix it and which tests depend on the source. Shown at the top of
 * the list and of the detail page for a source in error.
 */
export function ErrorPanel({ integration }: { integration: Integration }) {
  const { failure } = integration;
  if (!failure) return null;
  const dependents = dependentTests(integration.id, tests);
  return (
    <section
      aria-label={`${integration.name} needs a fix`}
      className="rounded-lg border border-red-200 bg-red-50/60 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status="error" />
        <h2 className="text-sm font-semibold text-slate-900">{integration.name} needs a fix</h2>
      </div>
      {integration.errorMessage && (
        <p className="mt-2 text-sm font-medium text-red-800">{integration.errorMessage}</p>
      )}
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-700">What broke</h3>
          <p className="mt-1 text-sm text-slate-800">{failure.what}</p>
          <h3 className="mt-3 text-xs font-semibold text-slate-700">Since</h3>
          <p className="mt-1 text-sm text-slate-800">{fmtDateTime(failure.since)}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-700">How to fix it</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {failure.fixSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-700">
            Tests that depend on it ({dependents.length})
          </h3>
          {dependents.length === 0 ? (
            <p className="mt-1 text-sm text-slate-700">No test reads from this source.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {dependents.map((t) => (
                <li key={t.id}>
                  <Link to={`/tests/${t.id}`} className="text-accent-700 hover:underline">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
