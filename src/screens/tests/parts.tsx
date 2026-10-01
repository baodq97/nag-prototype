import { Tag } from 'lucide-react';
import { getItems } from '../../data';
import type { FrameworkId } from '../../domain/types';
import { CHIP_CLASSES } from '../../ui/status';
import { Tooltip } from '../../ui/Tooltip';

const SHORT: Record<FrameworkId, string> = { 'eu-ai-act': 'AI Act', 'iso-42001': 'ISO 42001' };

function Chip({ framework, refText }: { framework: FrameworkId; refText: string }) {
  const variant = framework === 'eu-ai-act' ? 'info' : 'neutral';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${CHIP_CLASSES[variant]}`}
    >
      <span className="text-[0.7rem] font-normal opacity-80">{SHORT[framework]}</span>
      {refText}
    </span>
  );
}

/**
 * Framework references as chips. In a table cell pass `max` to keep the row one line: the rest
 * collapse into a "+n" chip whose tooltip lists them. Without `max` every chip wraps freely.
 */
export function FrameworkChips({ itemIds, max }: { itemIds: string[]; max?: number }) {
  const items = getItems(itemIds);
  if (items.length === 0) return <span className="text-xs text-slate-600">None</span>;
  const shown = max === undefined ? items : items.slice(0, max);
  const hidden = items.slice(shown.length);
  return (
    <span className={`flex items-center gap-1 ${max === undefined ? 'flex-wrap' : ''}`}>
      {shown.map((i) => (
        <Chip key={i.id} framework={i.framework} refText={i.ref} />
      ))}
      {hidden.length > 0 && (
        <Tooltip content={hidden.map((i) => `${SHORT[i.framework]} ${i.ref}`).join(', ')}>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${CHIP_CLASSES.neutral}`}
          >
            +{hidden.length}
          </span>
        </Tooltip>
      )}
    </span>
  );
}

/** Initials of a person's name in a round badge, so owners are recognisable at a glance. */
export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-100 text-[0.65rem] font-semibold text-accent-800"
    >
      {initials}
    </span>
  );
}

/** The category tag of a test or any other short label with a tag icon. */
export function CategoryTag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-slate-700">
      <Tag size={12} aria-hidden className="text-slate-500" />
      {children}
    </span>
  );
}
