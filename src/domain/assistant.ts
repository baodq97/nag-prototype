// The assistant's answer engine is a stub: deterministic keyword matching over the seed.
// It never generates text and answers nothing it cannot read from the demo data.

import { attentionBucket, controlPostureByFramework, controlTestStatus } from './posture';
import { score } from './risk';
import type {
  ComplianceDocument,
  ComplianceTest,
  Control,
  FrameworkItem,
  Integration,
  Risk,
} from './types';

export const FALLBACK = 'I can only answer from demo data. Try one of the suggested questions.';

export const SUGGESTED_QUESTIONS = [
  'Which controls are failing for Art. 14 and why?',
  'Which tests are overdue?',
  'What share of controls passes per framework?',
  'Which integrations need attention?',
  'Which risks have the highest residual score?',
  'Which documents did the assistant flag?',
];

export interface AssistantContext {
  now: string;
  timeZone: string;
  tests: ComplianceTest[];
  controls: Control[];
  items: FrameworkItem[];
  integrations: Integration[];
  risks: Risk[];
  documents: ComplianceDocument[];
}

export interface Citation {
  label: string;
  href: string;
}

export interface Answer {
  matched: boolean;
  text: string;
  citations: Citation[];
}

const FRAMEWORK_NAMES = { 'eu-ai-act': 'EU AI Act', 'iso-42001': 'ISO/IEC 42001' } as const;

function has(q: string, ...words: string[]): boolean {
  return words.every((w) => q.includes(w));
}

function failingControlsFor(article: string, ctx: AssistantContext): Answer {
  const item = ctx.items.find((i) => i.framework === 'eu-ai-act' && i.ref === `Art. ${article}`);
  if (!item)
    return { matched: true, text: `Art. ${article} is not in the demo data.`, citations: [] };
  const testsById = new Map(ctx.tests.map((t) => [t.id, t]));
  const failing = ctx.controls.filter(
    (c) => c.frameworkItemIds.includes(item.id) && !controlTestStatus(c, testsById).ok,
  );
  if (failing.length === 0) {
    return {
      matched: true,
      text: `No control mapped to Art. ${article} is failing.`,
      citations: [],
    };
  }
  const lines = failing.map((c) => {
    const reasons = c.testIds
      .flatMap((id) => testsById.get(id) ?? [])
      .filter((t) => t.status === 'failing')
      .map((t) => `${t.name} (${t.failingEntities.length} failing)`);
    return `${c.id} ${c.name}: ${reasons.join('; ')}`;
  });
  return {
    matched: true,
    text: `${failing.length} control(s) mapped to Art. ${article} are failing because of failing tests:\n${lines.join('\n')}`,
    citations: failing.map((c) => ({ label: c.id, href: `/controls?open=${c.id}` })),
  };
}

export function answerQuestion(question: string, ctx: AssistantContext): Answer {
  const q = question.toLowerCase();
  const article = /\bart(?:icle)?\.?\s*(\d+)/.exec(q)?.[1];
  if (article && has(q, 'control') && (has(q, 'fail') || has(q, 'why'))) {
    return failingControlsFor(article, ctx);
  }
  if (has(q, 'test', 'overdue')) {
    const overdue = ctx.tests.filter(
      (t) => attentionBucket(t, ctx.now, ctx.timeZone) === 'overdue',
    );
    return {
      matched: true,
      text: `${overdue.length} test(s) are overdue: ${overdue.map((t) => t.name).join(', ')}.`,
      citations: overdue.map((t) => ({ label: t.id, href: `/tests/${t.id}` })),
    };
  }
  if (has(q, 'framework') && (has(q, 'pass') || has(q, 'share'))) {
    const rows = controlPostureByFramework(ctx.controls, ctx.tests, ctx.items);
    return {
      matched: true,
      text: rows
        .map(
          (r) =>
            `${FRAMEWORK_NAMES[r.framework]}: ${r.passing}/${r.total} controls passing (${r.pct} %)`,
        )
        .join('\n'),
      citations: [{ label: 'Posture overview', href: '/' }],
    };
  }
  if (has(q, 'integration')) {
    const bad = ctx.integrations.filter((i) => i.status !== 'connected');
    return {
      matched: true,
      text: bad.map((i) => `${i.name}: ${i.errorMessage ?? i.status.replace('-', ' ')}`).join('\n'),
      citations: bad.map((i) => ({ label: i.name, href: `/integrations/${i.id}` })),
    };
  }
  if (has(q, 'risk') && (has(q, 'residual') || has(q, 'highest'))) {
    const top = [...ctx.risks].sort((a, b) => score(b.residual) - score(a.residual)).slice(0, 3);
    return {
      matched: true,
      text: top.map((r) => `${r.id} ${r.scenario}: residual ${score(r.residual)}`).join('\n'),
      citations: top.map((r) => ({ label: r.id, href: `/risks?open=${r.id}` })),
    };
  }
  if (has(q, 'document') && has(q, 'flag')) {
    const flagged = ctx.documents.filter((d) => d.assistantFlag);
    return {
      matched: true,
      text: flagged.map((d) => `${d.name}: ${d.assistantFlag}`).join('\n'),
      citations: flagged.map((d) => ({ label: d.name, href: `/documents?open=${d.id}` })),
    };
  }
  return { matched: false, text: FALLBACK, citations: [] };
}
