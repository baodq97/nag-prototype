import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
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
import { fmtDate } from '../../ui/format';
import { ObjectDrawer } from '../../ui/ObjectDrawer';
import { Page } from '../../ui/Page';
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
      sortValue: (c) => c.id,
      render: (c) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open(c.id);
          }}
          className="font-medium whitespace-nowrap text-accent-700 hover:underline"
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
      render: (c) => <span className="text-xs text-slate-700">{itemRefs(c.frameworkItemIds)}</span>,
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

function Mapped({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export default function Screen() {
  const [params] = useSearchParams();
  const [openId, setOpen] = useOpenParam();
  const selected = openId ? getControl(openId) : undefined;

  return (
    <Page
      title="Controls"
      description="Each control groups the tests that show it is working, plus the documents and policies behind it."
    >
      <DataTable
        key={params.get('q') ?? ''}
        label="controls"
        rows={controls}
        columns={columnsFor(setOpen)}
        facets={facets}
        rowKey={(c) => c.id}
        searchText={searchText}
        onRowClick={(c) => setOpen(c.id)}
        initialQuery={params.get('q') ?? ''}
        initialSort={{ key: 'id', dir: 'asc' }}
      />
      <ObjectDrawer
        onClose={() => setOpen(null)}
        object={
          selected && {
            id: selected.id,
            kind: 'Control',
            title: selected.name,
            owner: personName(selected.ownerId),
            status: statusOf(selected),
            due: { label: 'Due date', value: fmtDate(selected.dueDate) },
            frameworkItemIds: selected.frameworkItemIds,
            history: selected.history,
            comments: selected.comments,
          }
        }
      >
        {selected && (
          <>
            <p className="text-sm text-slate-700">{selected.description}</p>
            <Mapped title={`Mapped tests (${selected.testIds.length})`}>
              {selected.testIds.length === 0 ? (
                <p className="text-sm text-slate-600">No tests mapped.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1">
                  {selected.testIds.map((id) => {
                    const t = getTest(id);
                    return (
                      <li key={id} className="flex items-center justify-between gap-2 text-sm">
                        <Link to={`/tests/${id}`} className={LINK}>
                          {t?.name ?? id}
                        </Link>
                        {t && <StatusChip status={t.status} />}
                      </li>
                    );
                  })}
                </ul>
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
          </>
        )}
      </ObjectDrawer>
    </Page>
  );
}
