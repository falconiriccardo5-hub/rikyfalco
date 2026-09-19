'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons, type IconName } from './Icons';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/studio', label: 'Content Studio', icon: 'studio' },
  { href: '/agents', label: 'Agents', icon: 'agents' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/jobs', label: 'Jobs', icon: 'jobs' },
  { href: '/assets', label: 'Assets', icon: 'assets' },
  { href: '/brand', label: 'Brand', icon: 'brand' },
  { href: '/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname() ?? '/';

  return (
    <>
      {/* Desktop: icon + label rail */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-surface/70 p-4 backdrop-blur-xl lg:flex">
        <Link href="/" className="group mb-8 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-violet text-sm font-bold text-[#04060F]">
            R
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-primary">Orchestrator</span>
            <span className="block truncate text-[11px] text-muted">Riccardo Fitness</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = Icons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active
                    ? 'bg-accent/12 text-primary shadow-[inset_0_0_0_1px_rgba(76,141,255,0.35)]'
                    : 'text-secondary hover:bg-raised hover:text-primary'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-accent' : 'text-muted'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {userEmail && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="truncate px-3 text-xs text-muted" title={userEmail}>
              {userEmail}
            </p>
            <form action="/api/auth/logout" method="post" className="mt-2">
              <button type="submit" className="btn btn-sm w-full">
                <Icons.logout className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Mobile: bottom bar with 44px targets */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-surface/95 px-1 py-1.5 backdrop-blur-xl lg:hidden"
        aria-label="Main"
      >
        {NAV.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = Icons[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
