import { CircleCheck, CircleX, Clock, Hourglass } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import {
  FRAMEWORK_NAMES,
  NOW,
  integrations,
  itemRefs,
  personName,
  tenant,
  tests,
} from '../../data';
import { inTestTile, testCategory, testStrip } from '../../domain/summaries';
import type { ComplianceTest, FrameworkId } from '../../domain/types';
import { Button } from '../../ui/Button';
import { type Column, DataTable, type Facet } from '../../ui/DataTable';
import { fmtDate } from '../../ui/format';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';
import { humanize } from '../../ui/status';
import { SummaryStrip, type SummaryTile } from '../../ui/SummaryStrip';
import { useUrlParam } from '../../ui/useUrlParam';
import { testFrameworks } from './helpers';
import { CategoryTag, FrameworkChips } from './parts';

const category = (t: ComplianceTest) => testCategory(t, integrations);

const columns: Column<ComplianceTest>[] = [
  {
    key: 'name',
    header: 'Name',
    sortValue: (t) => t.name.toLowerCase(),
    className: 'max-w-72',
    render: (t) => (
      <Link
        to={`/tests/${t.id}`}
        className="flex min-h-10 items-center font-medium text-accent-700 hover:underline"
      >
        {t.name}
      </Link>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    sortValue: (t) => category(t),
    render: (t) => <CategoryTag>{category(t)}</CategoryTag>,
  },
  {
    key: 'owner',
    header: 'Owner',
    sortValue: (t) => personName(t.ownerId),
    render: (t) => <span className="whitespace-nowrap">{personName(t.ownerId)}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (t) => t.status,
    render: (t) => <StatusChip status={t.status} />,
  },
  {
    key: 'failing',
    header: 'Failing',
    sortValue: (t) => t.failingEntities.length,
    render: (t) => <span className="tabular-nums">{t.failingEntities.length}</span>,
  },
  {
    key: 'due',
    header: 'Due date',
    sortValue: (t) => t.dueDate,
    render: (t) => <span className="whitespace-nowrap">{fmtDate(t.dueDate)}</span>,
  },
  {
    key: 'frameworks',
    header: 'Frameworks',
    render: (t) => <FrameworkChips itemIds={t.frameworkItemIds} max={2} />,
  },
];

const facets: Facet<ComplianceTest>[] = [
  { key: 'status', label: 'Status', value: (t) => t.status, format: humanize },
  { key: 'category', label: 'Category', value: category },
  { key: 'owner', label: 'Owner', value: (t) => personName(t.ownerId) },
  {
    key: 'framework',
    label: 'Framework',
    value: (t) => testFrameworks(t),
    format: (v) => FRAMEWORK_NAMES[v as FrameworkId],
  },
];

const searchText = (t: ComplianceTest) =>
  `${t.id} ${t.name} ${personName(t.ownerId)} ${t.status} ${category(t)} ${itemRefs(t.frameworkItemIds)}`;

const TILES = ['passing', 'overdue', 'due-soon', 'needs-remediation'] as const;
type Tile = (typeof TILES)[number];
const isTile = (v: string | null): v is Tile => TILES.includes(v as Tile);

const strip = testStrip(tests, NOW, tenant.timeZone);
const TILE_DEFS: (SummaryTile & { key: Tile })[] = [
  {
    key: 'passing',
    label: 'Tests passing',
    value: `${strip.passingPct}%`,
    icon: CircleCheck,
    tone: 'success',
  },
  { key: 'overdue', label: 'Overdue', value: strip.overdue, icon: CircleX, tone: 'danger' },
  { key: 'due-soon', label: 'Due soon', value: strip.dueSoon, icon: Clock, tone: 'warning' },
  {
    key: 'needs-remediation',
    label: 'Due later',
    value: strip.needsRemediation,
    icon: Hourglass,
    tone: 'warning',
  },
];

export default function Screen() {
  const [tileParam, setTile] = useUrlParam('tile');
  const tile = isTile(tileParam) ? tileParam : null;
  const rows = useMemo(
    () => (tile ? tests.filter((t) => inTestTile(t, tile, NOW, tenant.timeZone)) : tests),
    [tile],
  );
  const tileLabel = TILE_DEFS.find((t) => t.key === tile)?.label;

  return (
    <Page title="Tests" demo>
      <SummaryStrip
        label="Test headline figures"
        tiles={TILE_DEFS}
        active={tile}
        onSelect={setTile}
      />
      <DataTable
        label="tests"
        rows={rows}
        columns={columns}
        facets={facets}
        rowKey={(t) => t.id}
        searchText={searchText}
        urlState
        problem={(t) => t.status === 'failing'}
        initialSort={{ key: 'due', dir: 'asc' }}
        empty={{ title: 'No tests yet', body: 'Tests appear here once a source is connected.' }}
        toolbar={
          tile && (
            <Button variant="ghost" size="sm" onClick={() => setTile(null)}>
              Clear tile: {tileLabel}
            </Button>
          )
        }
      />
    </Page>
  );
}
