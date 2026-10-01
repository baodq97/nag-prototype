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
