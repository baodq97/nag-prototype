import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { assistantContext } from '../../data';
import { type Answer, SUGGESTED_QUESTIONS, answerQuestion } from '../../domain/assistant';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { StubLabel } from '../../ui/Labels';
import { Page } from '../../ui/Page';

interface Turn {
  question: string;
  answer: Answer;
}

export default function Screen() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setTurns((t) => [...t, { question: q, answer: answerQuestion(q, assistantContext()) }]);
    setText('');
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(text);
  };

  return (
    <Page
      title="Assistant"
      demo
      description={
        <>
          <StubLabel what="Assistant answer engine" /> It answers only from demo data, by
          deterministic matching of your question. It does not generate text.
        </>
      }
    >
      <Card title="Suggested questions">
        <ul className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <li key={q}>
              <Button size="sm" onClick={() => ask(q)}>
                {q}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Conversation">
        <div className="flex flex-col gap-4">
          {turns.length === 0 && (
            <p className="text-sm text-slate-600">
              No questions yet. Pick a suggested question or type your own.
            </p>
          )}
          <ol className="flex flex-col gap-4" aria-label="Conversation" aria-live="polite">
            {turns.map((t, i) => (
              <li key={i} className="flex flex-col gap-2">
                <p className="self-end rounded-lg bg-accent-50 px-3 py-2 text-sm text-slate-900">
                  {t.question}
                </p>
                <div
                  data-testid="assistant-answer"
                  className="max-w-3xl rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <p className="text-xs font-semibold text-slate-600">Assistant</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-900">{t.answer.text}</p>
                  {t.answer.citations.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      Sources:
                      {t.answer.citations.map((c) => (
                        <Link
                          key={c.href + c.label}
                          to={c.href}
                          className="font-medium text-accent-700 hover:underline"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <form onSubmit={submit} className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
              Your question
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-accent-600 focus:ring-1 focus:ring-accent-600 focus:outline-none"
              />
            </label>
            <Button type="submit" variant="primary" disabled={!text.trim()}>
              Ask
            </Button>
          </form>
        </div>
      </Card>
    </Page>
  );
}
