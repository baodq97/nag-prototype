import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CHIP_CLASSES, type ChipVariant, VARIANT_ICON, statusInfo } from './status';
import { Tooltip } from './Tooltip';

interface Props {
  /** A domain status such as "failing"; picks the word, icon, variant and tooltip. */
  status?: string;
  variant?: ChipVariant;
  /** Overrides the registry icon, e.g. for a chip that is not a status. */
  icon?: LucideIcon;
  /** Overrides the registry description; an empty string shows no tooltip. */
  description?: string;
  children?: ReactNode;
}

/** A chip with an icon and a word, never colour alone; its description shows on hover or focus. */
export function StatusChip({ status, variant, icon, description, children }: Props) {
  const info = statusInfo(status ?? '');
  const v = variant ?? info.variant;
  const Icon = icon ?? (status ? info.icon : VARIANT_ICON[v]);
  const text = description ?? info.description;
  const chip = (
    <span
      data-chip={v}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${CHIP_CLASSES[v]}`}
    >
      <Icon size={12} aria-hidden className="shrink-0" />
      {children ?? info.label}
    </span>
  );
  return text ? <Tooltip content={text}>{chip}</Tooltip> : chip;
}
