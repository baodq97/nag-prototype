import { describe, expect, it } from 'vitest';
import { assistantContext } from '../data';
import { FALLBACK, SUGGESTED_QUESTIONS, answerQuestion } from './assistant';

const ctx = assistantContext();

describe('assistant (stub answer engine)', () => {
  it('answers every suggested question from the seed', () => {
    expect(SUGGESTED_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    for (const q of SUGGESTED_QUESTIONS) {
      const a = answerQuestion(q, ctx);
      expect(a.matched, q).toBe(true);
      expect(a.text).not.toBe(FALLBACK);
    }
  });

  it('explains failing Art. 14 controls with their failing tests', () => {
    const a = answerQuestion('Which controls are failing for Art. 14 and why?', ctx);
    expect(a.text).toContain('CTL-10 Human review of quarantined output');
    expect(a.text).toContain('Quarantined items decided within 8 business hours');
    expect(a.citations.map((c) => c.label)).toEqual(['CTL-10', 'CTL-11']);
  });

  it('handles articles with no failing control or not in the data', () => {
    expect(answerQuestion('Which controls fail for Art. 5?', ctx).text).toBe(
      'No control mapped to Art. 5 is failing.',
    );
    expect(answerQuestion('Why are controls failing for Article 99?', ctx).text).toBe(
      'Art. 99 is not in the demo data.',
    );
  });

  it('falls back for anything else', () => {
    expect(answerQuestion('What is the weather tomorrow?', ctx)).toEqual({
      matched: false,
      text: FALLBACK,
      citations: [],
    });
  });
});
