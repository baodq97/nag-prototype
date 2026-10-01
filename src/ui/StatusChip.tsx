import type { ReactNode } from 'react';
import { CHIP_CLASSES, type ChipVariant, humanize, variantOf } from './status';

interface Props {
  /** A domain status such as "failing"; picks the variant and the label. */
  status?: string;
  variant?: ChipVariant;
  children?: ReactNode;
}

export function StatusChip({ status, variant, children }: Props) {
  const v = variant ?? variantOf(status ?? '');
  return (
    <span
      data-chip={v}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${CHIP_CLASSES[v]}`}
    >
      {children ?? humanize(status ?? '')}
    </span>
  );
}
