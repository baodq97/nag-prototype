import { type FormEvent, useState } from 'react';
import {
  FRAMEWORK_NAMES,
  NOW,
  frameworkItems,
  tenant,
  trustEntries,
  trustUpdatedAt,
} from '../../data';
import { updatedAgo } from '../../domain/time';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { TextField } from '../../ui/Field';
import { StubLabel } from '../../ui/Labels';
import { Logo } from '../../ui/Logo';
import { StatusChip } from '../../ui/StatusChip';

// Public page for the tenant's customers and assessors, outside the console layout. Built
// mobile-first: a single column that must not scroll sideways at 375 px.

function LocalForm({
  title,
  intro,
  submitLabel,
  confirmation,
  withName,
}: {
  title: string;
  intro: string;
  submitLabel: string;
  confirmation: (email: string) => string;
  withName?: boolean;
}) {
  const [message, setMessage] = useState('');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMessage(confirmation(String(new FormData(form).get('email') ?? '')));
    form.reset();
  }

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {title}
          <StubLabel what="Sending the form" />
        </span>
      }
    >
      <form aria-label={title} onSubmit={onSubmit} className="flex flex-col gap-3">
        <p className="text-sm text-slate-700">{intro}</p>
        {withName && <TextField label="Your name" name="name" autoComplete="name" required />}
        <TextField label="Work email" name="email" type="email" autoComplete="email" required />
        <div>
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
        <p role="status" className="min-h-5 text-sm font-medium text-emerald-800">
          {message}
        </p>
      </form>
    </Card>
  );
}

export default function Screen() {
  const frameworks = Object.entries(FRAMEWORK_NAMES);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <title>{`Trust page – ${tenant.name}`}</title>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <span className="text-xs text-slate-600">{updatedAgo(trustUpdatedAt, NOW)}</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold">Trust page</h1>
          <p className="mt-1 text-sm font-medium text-slate-800">{tenant.name}</p>
          <p className="mt-2 text-sm text-slate-700">
            How we run and oversee our AI systems. The controls below support compliance readiness
            for the frameworks we work towards; they are a progress report, not a certificate.
          </p>
        </div>

        <Card title="Frameworks">
          <ul className="flex flex-col gap-2">
            {frameworks.map(([id, name]) => (
              <li key={id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-slate-600">
                  {frameworkItems.filter((i) => i.framework === id).length} requirements mapped
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <section aria-labelledby="trust-controls" className="flex flex-col gap-3">
          <h2 id="trust-controls" className="text-lg font-semibold">
            Controls by category
          </h2>
          <p className="text-sm text-slate-700">
            Each status is worked out from the live state of our compliance console, not set by
            hand: whether the tests behind a control pass, whether the policies and documents
            behind it are approved and reviewed on time, and whether the evidence records verify. “In place” means
            every check behind the claim passes. “Under remediation” means a check behind the claim
            currently fails, even when the work is still planned. “In progress” means the work is
            planned and not finished, and no check behind it fails.
          </p>
          {trustEntries().map((cat) => (
            <Card key={cat.id} title={cat.name}>
              <ul className="flex flex-col gap-2">
                {cat.entries.map((c) => (
                  <li
                    key={c.name}
                    className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-sm"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <span>{c.name}</span>
                      {c.status === 'under-remediation' && (
                        <p className="mt-0.5 text-xs text-slate-600">
                          A check behind this claim currently fails.
                        </p>
                      )}
                    </div>
                    <StatusChip status={c.status} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </section>

        <LocalForm
          title="Request access"
          intro="Ask for the detailed evidence pack. Nothing is sent from this prototype."
          submitLabel="Request access"
          withName
          confirmation={(email) => `Request noted for ${email}. Nothing was sent.`}
        />
        <LocalForm
          title="Subscribe"
          intro="Get a note when this page changes. Nothing is sent from this prototype."
          submitLabel="Subscribe"
          confirmation={(email) => `Subscription noted for ${email}. Nothing was sent.`}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3 text-xs text-slate-600">
          <span>Powered by</span>
          <Logo size={18} />
        </div>
      </footer>
    </div>
  );
}
