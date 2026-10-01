import { CircleCheck, CircleX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  FRAMEWORK_NAMES,
  controlStatus,
  controls,
  frameworkItems,
  getControl,
  getDocument,
  getPolicy,
  getTest,
  itemRefs,
  personName,
} from '../../data';
import { frameworksOf } from '../../domain/posture';
import type { Control, FrameworkId } from '../../domain/types';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { fmtDate } from '../../ui/format';
import { ObjectActivity } from '../../ui/ObjectDrawer';
import { Page } from '../../ui/Page';
import { Avatar, FrameworkChips } from '../tests/parts';
import { StatusChip } from '../../ui/StatusChip';
import { humanize } from '../../ui/status';
import { useOpenParam } from '../../ui/useOpenParam';

const statusOf = (c: Control) => (controlStatus(c).ok ? 'passing' : 'failing');
const frameworksFor = (c: Control) => frameworksOf(c.frameworkItemIds, frameworkItems);

function columnsFor(open: (id: string) => void): Column<Control>[] {
  return [
    {
      key: 'id',
      header: 'ID',
      id: true,
      sortValue: (c) => c.id,
      render: (c) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open(c.id);
          }}
          className="font-medium text-accent-700 hover:underline"
        >
          {c.id}
        </button>
      ),
    },
    {
      key: 'name',
      header: 'Control',
      sortValue: (c) => c.name.toLowerCase(),
      render: (c) => c.name,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (c) => personName(c.ownerId),
      render: (c) => personName(c.ownerId),
    },
    {
      key: 'frameworks',
      header: 'Frameworks',
      render: (c) => <FrameworkChips itemIds={c.frameworkItemIds} max={2} />,
    },
    {
      key: 'tests',
      header: 'Tests passing',
      sortValue: (c) => {
        const s = controlStatus(c);
        return s.total === 0 ? 1 : s.passing / s.total;
      },
      render: (c) => {
        const s = controlStatus(c);
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <StatusChip status={statusOf(c)} />
            <span className="tabular-nums">
              {s.passing}/{s.total} tests passing
            </span>
          </span>
        );
      },
    },
  ];
}

const facets: Facet<Control>[] = [
  {
    key: 'framework',
    label: 'Framework',
    value: frameworksFor,
    format: (v) => FRAMEWORK_NAMES[v as FrameworkId],
  },
  { key: 'owner', label: 'Owner', value: (c) => personName(c.ownerId) },
  { key: 'status', label: 'Status', value: statusOf, format: humanize },
];

const searchText = (c: Control) =>
  `${c.id} ${c.name} ${personName(c.ownerId)} ${itemRefs(c.frameworkItemIds)}`;

const LINK = 'text-accent-700 hover:underline';

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function Mapped({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export default function Screen() {
  const [openId, setOpen] = useOpenParam();
  const selected = openId ? getControl(openId) : undefined;
  const progress = selected ? controlStatus(selected) : undefined;

  return (
    <Page title="Controls">
      <DataTable
        label="controls"
        rows={controls}
        columns={columnsFor(setOpen)}
        facets={facets}
        rowKey={(c) => c.id}
        searchText={searchText}
        onRowClick={(c) => setOpen(c.id)}
        urlState
        problem={(c) => !controlStatus(c).ok}
        initialSort={{ key: 'id', dir: 'asc' }}
        empty={{ title: 'No controls yet', body: 'Controls appear here once they are defined.' }}
      />
      <Drawer
        open={selected !== undefined}
        onClose={() => setOpen(null)}
        title={selected?.name ?? ''}
        subtitle={selected && `Control · ${selected.id}`}
      >
        {selected && progress && (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <Meta label="Owner">
                <span className="flex items-center gap-2">
                  <Avatar name={personName(selected.ownerId)} />
                  {personName(selected.ownerId)}
                </span>
              </Meta>
              <Meta label="Status">
                <StatusChip status={statusOf(selected)} />
              </Meta>
              <Meta label="Due date">{fmtDate(selected.dueDate)}</Meta>
              <Meta label="Frameworks">
                <FrameworkChips itemIds={selected.frameworkItemIds} />
              </Meta>
            </dl>
            <p className="text-sm text-slate-700">{selected.description}</p>
            <Mapped title={`Mapped tests (${selected.testIds.length})`}>
              {selected.testIds.length === 0 ? (
                <p className="text-sm text-slate-600">No tests mapped.</p>
              ) : (
                <>
                  <p className="mt-0.5 text-sm font-medium text-slate-900 tabular-nums">
                    Tests {progress.passing} of {progress.total} passing
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {selected.testIds.map((id) => {
                      const t = getTest(id);
                      const ok = t?.status === 'passing';
                      return (
                        <li key={id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-1.5">
                            {ok ? (
                              <CircleCheck size={16} aria-hidden className="text-emerald-700" />
                            ) : (
                              <CircleX size={16} aria-hidden className="text-red-700" />
                            )}
                            <span className="sr-only">{ok ? 'Passing: ' : 'Failing: '}</span>
                            <Link to={`/tests/${id}`} className={LINK}>
                              {t?.name ?? id}
                            </Link>
                          </span>
                          {t && <StatusChip status={t.status} />}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </Mapped>
            <Mapped title={`Documents (${selected.documentIds.length})`}>
              {selected.documentIds.length === 0 ? (
                <p className="text-sm text-slate-600">No documents linked.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {selected.documentIds.map((id) => (
                    <li key={id}>
                      <Link to={`/documents?open=${id}`} className={LINK}>
                        {getDocument(id)?.name ?? id}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Mapped>
            <Mapped title={`Policies (${selected.policyIds.length})`}>
              {selected.policyIds.length === 0 ? (
                <p className="text-sm text-slate-600">No policies linked.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {selected.policyIds.map((id) => (
                    <li key={id}>
                      <Link to={`/policies?open=${id}`} className={LINK}>
                        {getPolicy(id)?.name ?? id}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Mapped>
            <ObjectActivity
              object={{
                id: selected.id,
                kind: 'Control',
                history: selected.history,
                comments: selected.comments,
              }}
            />
          </>
        )}
      </Drawer>
    </Page>
  );
}
