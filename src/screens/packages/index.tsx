import { Cpu, Download, FileText, type LucideIcon, UserPen } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  controls,
  deployment,
  evidence,
  packageElements,
  packageReadiness,
  packageSections,
  tests,
} from '../../data';
import type {
  AssessmentRoute,
  DeclarationGroup,
  PackageSection,
  SectionSource,
} from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card, Stat } from '../../ui/Card';
import { StubLabel } from '../../ui/Labels';
import { Modal } from '../../ui/Modal';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const ROUTE_LABELS: Record<AssessmentRoute, string> = {
  'self-assessment': 'Self-assessment',
  'notified-body': 'Notified body',
};

const ROUTE_HINTS: Record<AssessmentRoute, string> = {
  'self-assessment':
    'The provider checks its own system against the requirements and keeps the technical file ready.',
  'notified-body':
    'An outside assessment body reviews the technical file, so the package adds an application section.',
};

const SOURCE_LABELS: Record<SectionSource, string> = {
  runtime: 'Runtime-derived',
  template: 'Template',
  customer: 'Customer-authored',
};

// Source chips are neutral and distinct from state chips: no status colour, no warning icon, and
// each source has its own outline, tint and icon.
const SOURCE_STYLE: Record<SectionSource, { icon: LucideIcon; classes: string }> = {
  runtime: {
    icon: Cpu,
    classes: 'border border-solid border-slate-300 bg-slate-100 text-slate-800',
  },
  customer: {
    icon: UserPen,
    classes: 'border border-solid border-slate-500 bg-white text-slate-900',
  },
  template: {
    icon: FileText,
    classes: 'border border-dashed border-slate-400 bg-slate-50 text-slate-700',
  },
};

function SourceChip({ source }: { source: SectionSource }) {
  const { icon: Icon, classes } = SOURCE_STYLE[source];
  return (
    <span
      data-source={source}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${classes}`}
    >
      <Icon size={12} aria-hidden className="shrink-0" />
      {SOURCE_LABELS[source]}
    </span>
  );
}

const GROUP_TITLES: Record<DeclarationGroup, string> = {
  declaration: 'Declaration of conformity',
  deployer: 'Deployer agreement',
  supplier: 'Supplier inputs',
};

function SectionList({ sections }: { sections: PackageSection[] }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {sections.map((s) => (
        <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">
              <span className="mr-2 text-xs font-normal text-slate-600">{s.id}</span>
              {s.title}
            </p>
            <p className="text-xs text-slate-600">{s.summary}</p>
          </div>
          <SourceChip source={s.source} />
        </li>
      ))}
    </ul>
  );
}

const annexIv = packageSections.filter((s) => s.annexIv);
const annexCount = (source: SectionSource) => annexIv.filter((s) => s.source === source).length;

const GUIDE_STEPS = [
  'Take the exported evidence range and the published batch roots.',
  'Recompute each record hash and check it links to the one before it.',
  'Rebuild each batch root from its records and compare it with the stored root.',
  'Check the external timestamp token for each batch with the authority’s public tools.',
  'Report any gap in the sequence numbers as a finding rather than filling it in.',
];

export default function Screen() {
  const { scenario, label } = deployment();
  const [route, setRoute] = useState<AssessmentRoute>(scenario.route);
  const [exporting, setExporting] = useState(false);
  const sections = packageSections.filter((s) => s.routes.includes(route));
  const ready = packageReadiness();

  return (
    <Page
      title="Conformity packages"
      demo
      actions={
        <Button variant="primary" onClick={() => setExporting(true)}>
          <Download size={14} aria-hidden />
          Export
        </Button>
      }
    >
      <div>
        <p className="text-sm font-medium text-slate-900" data-testid="package-readiness">
          {ready.complete} of {ready.total} items complete, {ready.missing} missing,{' '}
          {ready.missingYours} of them yours
        </p>
        <p className="text-xs text-slate-600">
          The package supports compliance readiness; the provider stays responsible for the
          assessment.
        </p>
      </div>

      <p className="text-sm text-slate-700" data-testid="package-deployment">
        <span className="font-medium text-slate-900">{label}</span>
        {' · '}
        {scenario.name}.{' '}
        <Link to="/onboarding" className="font-medium text-accent-700 hover:underline">
          Review in onboarding
        </Link>
      </p>

      <section aria-label="Package checklist" className="grid gap-4 lg:grid-cols-3">
        {packageElements().map((g) => (
          <Card key={g.group} title={GROUP_TITLES[g.group]}>
            <p className="mb-2 text-sm font-medium text-slate-900">
              {g.complete} of {g.total} complete
            </p>
            <ul className="divide-y divide-slate-100">
              {g.elements.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2 py-2">
                  {e.state === 'missing' && e.href ? (
                    <Link
                      to={e.href}
                      data-testid="missing-item"
                      className="min-w-0 text-sm font-medium text-accent-700 hover:underline"
                    >
                      {e.title}
                    </Link>
                  ) : (
                    <span className="min-w-0 text-sm text-slate-800">{e.title}</span>
                  )}
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    <SourceChip source={e.source} />
                    <StatusChip variant={e.state === 'complete' ? 'success' : 'warning'}>
                      {e.state === 'complete' ? 'Complete' : 'Missing'}
                    </StatusChip>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-1 text-sm font-medium text-slate-700">Assessment route</legend>
        {(Object.keys(ROUTE_LABELS) as AssessmentRoute[]).map((r) => (
          <label
            key={r}
            className={`flex max-w-md flex-1 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${route === r ? 'border-accent-600 bg-accent-50' : 'border-slate-200 bg-white'}`}
          >
            <input
              type="radio"
              name="route"
              value={r}
              checked={route === r}
              onChange={() => setRoute(r)}
              className="mt-1 accent-accent-600"
            />
            <span>
              <span className="block font-medium text-slate-900">{ROUTE_LABELS[r]}</span>
              <span className="block text-xs text-slate-600">{ROUTE_HINTS[r]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <section aria-label="Sections" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Sections for the {ROUTE_LABELS[route].toLowerCase()} route ({sections.length})
        </h2>
        <SectionList sections={sections} />
      </section>

      <Card title="Annex IV inputs summary">
        <div className="grid max-w-xl grid-cols-3 gap-3">
          <Stat label="Annex IV sections" value={annexIv.length} />
          <Stat label="Runtime-derived" value={annexCount('runtime')} />
          <Stat label="Template" value={annexCount('template')} />
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Runtime-derived sections are filled from the evidence and tests. Template sections start
          from our wording and need the provider’s own content.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Declaration of Conformity draft">
          <div className="relative overflow-hidden rounded-md border border-dashed border-slate-400 bg-slate-50 p-4">
            <p
              data-testid="doc-watermark"
              className="mb-3 inline-block rounded-md bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-900 ring-1 ring-amber-300 ring-inset"
            >
              Unsigned draft – requires the provider’s signature
            </p>
            <p className="text-sm text-slate-800">
              The provider declares that the AI system described in this package meets the
              requirements that apply to it, and lists the standards and specifications it relied
              on.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-600">Provider</dt>
                <dd className="text-slate-900">To be completed by the provider</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Signatory</dt>
                <dd className="text-slate-900">To be completed by the provider</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-sm text-slate-700">
            NAG never signs this declaration. Only the provider can sign it, outside NAG, and this
            screen has no control that does so.
          </p>
        </Card>

        <Card title="Offline verification guide">
          <p className="mb-2 text-sm text-slate-700">
            An assessor can check the evidence layers without access to NAG:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {GUIDE_STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Modal
        open={exporting}
        title="Export package summary"
        onClose={() => setExporting(false)}
        footer={
          <Button variant="primary" onClick={() => setExporting(false)}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm text-slate-800">
            Seeded summary for the {ROUTE_LABELS[route].toLowerCase()} route{' '}
            <StubLabel what="Package export" />
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Evidence records" value={evidence.length} />
            <Stat label="Tests" value={tests.length} />
            <Stat label="Controls" value={controls.length} />
            <Stat label="Sections" value={sections.length} />
          </div>
          <p className="text-sm text-slate-800">Target: 1,000 records in under 60 s</p>
          <p className="text-xs text-slate-600">
            This is a design target, not a measurement. No file is produced in this prototype.
          </p>
        </div>
      </Modal>
    </Page>
  );
}
