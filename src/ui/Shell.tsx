import { ChevronDown, CircleUser } from 'lucide-react';
import { Suspense, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { currentUserId, people, tenant } from '../data';
import { NAV_GROUPS, routes } from '../routes';
import { CommandSearch } from './CommandSearch';
import { StubLabel } from './Labels';
import { Logo } from './Logo';

function UserMenu() {
  const [open, setOpen] = useState(false);
  const user = people.find((p) => p.id === currentUserId)!;
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-800 hover:bg-slate-100"
      >
        <CircleUser size={18} aria-hidden />
        {user.name}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-60 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          <p className="px-3 py-1.5 text-xs text-slate-600">{user.role}</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50"
          >
            Sign out <StubLabel what="Authentication" />
          </button>
        </div>
      )}
    </div>
  );
}

export function Loading() {
  return <p className="px-6 py-5 text-sm text-slate-600">Loading…</p>;
}

/** The console layout: grouped left navigation, top bar, and the screen. */
export function Shell() {
  return (
    <div className="flex min-h-screen">
      <nav
        aria-label="Main"
        className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4"
      >
        <div className="px-2">
          <Logo />
          <p className="mt-1 text-xs text-slate-600">Supports compliance readiness</p>
        </div>
        {NAV_GROUPS.map((group) => (
          <div key={group}>
            <h2 className="px-2 pb-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              {group}
            </h2>
            <ul>
              {routes
                .filter((r) => r.nav?.group === group)
                .map((r) => {
                  const Icon = r.nav!.icon;
                  return (
                    <li key={r.id}>
                      <NavLink
                        to={r.sample}
                        end={r.path === '/'}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${isActive ? 'bg-accent-50 font-medium text-accent-800' : 'text-slate-700 hover:bg-slate-100'}`
                        }
                      >
                        <Icon size={15} aria-hidden />
                        {r.nav!.label}
                      </NavLink>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <CommandSearch />
          <div className="ml-auto flex items-center gap-3">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {tenant.name}
            </span>
            <UserMenu />
          </div>
        </header>
        <main className="min-w-0 flex-1">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
