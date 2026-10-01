import { Ban, CircleCheck, CircleDashed, Eye, type LucideIcon, TriangleAlert } from 'lucide-react';
import { RISK_TIER_DESCRIPTION, riskTierLabel } from '../domain/classification';
import type { RiskTier } from '../domain/types';
import type { ChipVariant } from './status';
import { StatusChip } from './StatusChip';

const STYLE: Record<RiskTier | 'none', [ChipVariant, LucideIcon]> = {
  prohibited: ['danger', Ban],
  high: ['warning', TriangleAlert],
  transparency: ['info', Eye],
  minimal: ['success', CircleCheck],
  none: ['neutral', CircleDashed],
};

/** The one risk tier chip every screen uses: number, name, icon and colour. */
export function RiskTierChip({ riskTier }: { riskTier: RiskTier | null }) {
  const [variant, icon] = STYLE[riskTier ?? 'none'];
  return (
    <StatusChip
      variant={variant}
      icon={icon}
      description={RISK_TIER_DESCRIPTION[riskTier ?? 'none']}
    >
      {riskTierLabel(riskTier)}
    </StatusChip>
  );
}
