import { deployment } from '../../data';
import { Card } from '../../ui/Card';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const { level, scenario, levels, scenarios } = deployment();

// Only the host differs between the two base URLs: the path and the code around them are shared.
const PATH = '/v1';
const BEFORE_HOST = 'models.provider.example';
const AFTER_HOST = 'gateway.nag.example';

const ROUTE_LABELS: Record<string, string> = {
  'self-assessment': 'Self-assessment',
  'notified-body': 'Notified body',
};

// The tenant's row is tinted and carries a "Your tenant" chip, so it is not marked by colour alone.
const rowClass = (own: boolean) => `align-top ${own ? 'bg-accent-50' : ''}`;

function Snippet({ host }: { host: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
      <code>
        {'const client = new ModelClient({\n  baseUrl: "https://'}
        <strong className="rounded bg-accent-700 px-1 font-semibold text-white">{host}</strong>
        {`${PATH}",\n  apiKey: process.env.MODEL_API_KEY,\n});`}
      </code>
    </pre>
  );
}

export default function Screen() {
  return (
    <Page
      title="Onboarding"
      demo
      description="How a team connects its model calls, how deep the integration goes and which assessment route applies. It supports compliance readiness and does not replace your own assessment."
    >
      <Card title="Connect">
        <p className="mb-3 text-sm text-slate-900">
          Point the client at the gateway instead of the model endpoint. Only the host changes; the
          path and the code stay the same.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <figure aria-label="Before: direct to the model endpoint">
            <figcaption className="mb-1 text-xs font-medium text-slate-600">
              Before: direct to the model endpoint
            </figcaption>
            <Snippet host={BEFORE_HOST} />
          </figure>
          <figure aria-label="After: through the gateway">
            <figcaption className="mb-1 text-xs font-medium text-slate-600">
              After: through the gateway
            </figcaption>
            <Snippet host={AFTER_HOST} />
          </figure>
        </div>
      </Card>

      <Card title="Integration levels">
        <p className="mb-3 text-sm text-slate-900">
          Each level includes the one before it. Your tenant is at {level.name}.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Integration levels</caption>
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['Integration level', 'What it adds', 'Typical effort'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {levels.map((l) => (
                <tr
                  key={l.id}
                  aria-current={l.id === level.id ? 'true' : undefined}
                  className={rowClass(l.id === level.id)}
                >
                  <th scope="row" className="px-3 py-2 font-medium text-slate-900">
                    <span className="flex flex-wrap items-center gap-2">
                      {l.name}
                      {l.id === level.id && <StatusChip variant="info">Your tenant</StatusChip>}
                    </span>
                  </th>
                  <td className="px-3 py-2 text-slate-900">{l.adds}</td>
                  <td className="px-3 py-2 text-slate-900">{l.effort}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-900">
          The MCP inspector is being trialled. The tenant reaches Evidence grade once it is
          connected and the evidence build-up is done.
        </p>
      </Card>

      <Card title="Deployment scenarios">
        <p className="mb-3 text-sm text-slate-900">
          In both scenarios the provider signs the declaration of conformity. NAG never signs it.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Deployment scenarios</caption>
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['Scenario', 'Name', 'Assessment route', 'Evidence build-up'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scenarios.map((s) => (
                <tr
                  key={s.id}
                  aria-current={s.id === scenario.id ? 'true' : undefined}
                  className={rowClass(s.id === scenario.id)}
                >
                  <th scope="row" className="px-3 py-2 font-medium text-slate-900">
                    <span className="flex flex-wrap items-center gap-2">
                      {s.id}
                      {s.id === scenario.id && <StatusChip variant="info">Your tenant</StatusChip>}
                    </span>
                  </th>
                  <td className="px-3 py-2 text-slate-900">{s.name}</td>
                  <td className="px-3 py-2 text-slate-900">{ROUTE_LABELS[s.route] ?? s.route}</td>
                  <td className="px-3 py-2 text-slate-900">{s.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
