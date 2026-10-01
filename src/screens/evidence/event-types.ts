import {
  CircleCheck,
  CircleHelp,
  Gauge,
  Hourglass,
  KeyRound,
  type LucideIcon,
  Power,
  ShieldBan,
  Unplug,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { CodeId } from '../../domain/types';

/** How an evidence record's event type reads in the table: a short word and an icon. */
export interface EventType {
  label: string;
  icon: LucideIcon;
}

/** Plain labels for the codes NAG writes into evidence records. The raw code stays in the drawer. */
export const EVENT_TYPES: Record<CodeId, EventType> = {
  'NAG-D001': { label: 'Allowed', icon: CircleCheck },
  'NAG-D002': { label: 'Blocked', icon: ShieldBan },
  'NAG-D003': { label: 'Quarantined', icon: Hourglass },
  'NAG-D004': { label: 'Kill switch', icon: Power },
  'NAG-D005': { label: 'Review approved', icon: UserCheck },
  'NAG-D006': { label: 'Review rejected', icon: UserX },
  'NAG-E001': { label: 'Key destroyed', icon: KeyRound },
  'NAG-E002': { label: 'Budget breach', icon: Gauge },
  'NAG-E003': { label: 'Bypass', icon: Unplug },
};

/** The label and icon of a code; a code with no entry shows as the code itself. */
export function eventType(code: string): EventType {
  return (
    (EVENT_TYPES as Record<string, EventType | undefined>)[code] ?? {
      label: code,
      icon: CircleHelp,
    }
  );
}
