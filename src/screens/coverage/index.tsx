import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { coverage, getControl, getTest } from '../../data';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const STATUS_LABEL = { covered: 'Covered', partial: 'Partial', customer: 'Customer' } as const;

const LINK = 'text-accent-700 hover:underline';

export default function Screen() {
  const { hash } = useLocation();

  // Command search links to /coverage#aia-14; bring that row into view.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'center' });
  }, [hash]);

  return (
    <Page
      title="Article coverage"
      description="For each EU AI Act article in scope: what NAG covers, what stays with you, and the tests and controls behind it. Partial and customer rows need your own work to support compliance readiness."
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Coverage by article</caption>
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Article
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                What NAG covers
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                What you must do
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Linked tests and controls
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coverage.map((row) => (
              <tr
                key={row.frameworkItemId}
                id={row.frameworkItemId}
                className={`scroll-mt-20 ${hash === `#${row.frameworkItemId}` ? 'bg-accent-50' : ''}`}
              >
                <th scope="row" className="w-44 px-3 py-3 align-top font-medium text-slate-900">
                  {row.article}
                  <span className="block text-xs font-normal text-slate-600">{row.title}</span>
                </th>
                <td className="px-3 py-3 align-top text-slate-800">{row.nagCovers}</td>
                <td className="px-3 py-3 align-top text-slate-800">{row.customerMust}</td>
                <td className="px-3 py-3 align-top">
                  <StatusChip status={row.status}>{STATUS_LABEL[row.status]}</StatusChip>
                </td>
                <td className="w-56 px-3 py-3 align-top text-xs">
                  <p className="font-medium text-slate-600">Tests</p>
                  <ul
                    className="mb-2 flex flex-wrap gap-x-2 gap-y-0.5"
                    aria-label={`Tests for ${row.article}`}
                  >
                    {row.testIds.length === 0 && <li className="text-slate-600">None</li>}
                    {row.testIds.map((id) => (
                      <li key={id}>
                        <Link to={`/tests/${id}`} title={getTest(id)?.name} className={LINK}>
                          {id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="font-medium text-slate-600">Controls</p>
                  <ul
                    className="flex flex-wrap gap-x-2 gap-y-0.5"
                    aria-label={`Controls for ${row.article}`}
                  >
                    {row.controlIds.length === 0 && <li className="text-slate-600">None</li>}
                    {row.controlIds.map((id) => (
                      <li key={id}>
                        <Link
                          to={`/controls?open=${id}`}
                          title={getControl(id)?.name}
                          className={LINK}
                        >
                          {id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
