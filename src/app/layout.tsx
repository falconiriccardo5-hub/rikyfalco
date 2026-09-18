import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Riccardo AI Content Orchestrator',
  description: 'Brief to approved Instagram Reel, through a pipeline of AI agents.',
};

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/studio', label: 'Content Studio' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/jobs', label: 'Generation Jobs' },
  { href: '/assets', label: 'Assets' },
  { href: '/brand', label: 'Brand' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="flex min-h-screen">
          <aside className="hidden w-60 shrink-0 border-r border-line bg-surface/60 p-5 lg:block">
            <Link href="/" className="block">
              <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Riccardo</p>
              <p className="mt-1 text-sm font-semibold text-neutral-200">AI Content Orchestrator</p>
            </Link>
            <nav className="mt-8 space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-raised hover:text-neutral-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
