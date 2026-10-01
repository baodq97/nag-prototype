import { Link } from 'react-router';
import { getControl, getTest } from '../../data';
import type { CoverageAttention } from '../../domain/types';

// Underlined at rest: the link sits inside a line of text, so colour alone must not mark it.
const LINK = 'text-accent-700 underline';

/** One line on a row that needs attention: which control fails, linking to the failing test. */
export function AttentionLine({
  attention,
  compact = false,
}: {
  attention: CoverageAttention;
  /** The shorter wording a table row uses; the drawer and the system list keep the full one. */
  compact?: boolean;
}) {
  const control = getControl(attention.controlId);
  const test = getTest(attention.testId);
  return (
    <span
      className={`mt-1 text-xs text-slate-700 ${compact ? 'line-clamp-2' : 'block'}`}
      data-testid="attention-line"
    >
      {compact ? 'Failing' : 'Control'} “{control?.name ?? attention.controlId}”
      {compact ? '' : ' is failing'}. Next:{' '}
      <Link to={`/tests/${attention.testId}`} className={LINK}>
        {test?.name ?? attention.testId}
      </Link>
    </span>
  );
}
