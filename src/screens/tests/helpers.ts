import {
  FRAMEWORK_NAMES,
  controlStatus,
  controlsForTest,
  frameworkItems,
  getItems,
} from '../../data';
import { frameworksOf } from '../../domain/posture';
import type { ComplianceTest, FrameworkId } from '../../domain/types';

export interface FrameworkStatus {
  framework: string;
  refs: string;
  /** Controls linked to the test that map to this framework, and how many of them pass. */
  passing: number;
  total: number;
}

/** Per framework, the state of the controls this test feeds into for that framework. */
export function testFrameworkStatus(test: ComplianceTest): FrameworkStatus[] {
  const linked = controlsForTest(test.id);
  const refs = testFrameworkRefs(test);
  return testFrameworks(test).map((fw, i) => {
    const mapped = linked.filter((c) =>
      frameworksOf(c.frameworkItemIds, frameworkItems).includes(fw),
    );
    return {
      framework: FRAMEWORK_NAMES[fw],
      refs: refs[i]?.refs ?? '',
      passing: mapped.filter((c) => controlStatus(c).ok).length,
      total: mapped.length,
    };
  });
}

/** The frameworks a test maps to, via its framework items. */
export const testFrameworks = (test: ComplianceTest): FrameworkId[] =>
  frameworksOf(test.frameworkItemIds, frameworkItems);

/** Where to look at a failing entity: the screen that shows that kind of thing, and its name. */
export interface EntityTarget {
  to: string;
  label: string;
}

const SYSTEM_FOR_MODEL: [string, string][] = [
  ['credit', 'sys-credit'],
  ['support', 'sys-support'],
];

/**
 * A fixed target per kind of entity. The entity strings in the seed read "<kind> <name>"; a kind
 * with no screen of its own points at the nearest screen that shows it.
 */
export function entityTarget(entity: string, integrationId: string): EntityTarget {
  const space = entity.indexOf(' ');
  const kind = space < 0 ? entity : entity.slice(0, space);
  const name = space < 0 ? '' : entity.slice(space + 1);
  switch (kind) {
    case 'endpoint':
      return { to: '/runtime-health', label: 'Runtime health' };
    case 'model': {
      const system = SYSTEM_FOR_MODEL.find(([prefix]) => name.startsWith(prefix))?.[1];
      return { to: system ? `/ai-systems?open=${system}` : '/ai-systems', label: 'AI systems' };
    }
    case 'dataset':
      return { to: '/ai-systems', label: 'AI systems' };
    case 'document':
      return { to: `/documents?open=${name}`, label: 'Document' };
    case 'reviewer':
      return { to: '/quarantine', label: 'Quarantine queue' };
    case 'agent':
      return { to: '/lineage', label: 'Lineage' };
    case 'bucket':
      return { to: '/evidence', label: 'Evidence' };
    default:
      return { to: `/integrations/${integrationId}`, label: 'Source integration' };
  }
}

/** Whole days from the reference date to a due date, as words: "6 days overdue", "due today". */
export function dueWords(days: number): string {
  if (days === 0) return 'due today';
  const n = Math.abs(days);
  const unit = n === 1 ? 'day' : 'days';
  return days < 0 ? `${n} ${unit} overdue` : `due in ${n} ${unit}`;
}

/** Per framework, the references the test maps to: "EU AI Act: Art. 14". */
export function testFrameworkRefs(test: ComplianceTest): { framework: string; refs: string }[] {
  const items = getItems(test.frameworkItemIds);
  return testFrameworks(test).map((fw) => ({
    framework: FRAMEWORK_NAMES[fw],
    refs: items
      .filter((i) => i.framework === fw)
      .map((i) => i.ref)
      .join(', '),
  }));
}
