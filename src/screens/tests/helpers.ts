import { FRAMEWORK_NAMES, frameworkItems, getItems } from '../../data';
import { frameworksOf } from '../../domain/posture';
import type { ComplianceTest, FrameworkId } from '../../domain/types';

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
