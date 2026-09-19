import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import { currentUser } from '@/lib/security/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Riccardo AI Content Orchestrator',
  description: 'Brief to approved Instagram Reel, through a pipeline of AI agents.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05060B',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Never throws: a missing database must not blank the whole shell.
  const user = await currentUser().catch(() => null);

  return (
    <html lang="it" className={inter.variable}>
      <body>
        <div className="aurora" aria-hidden />
        <div className="flex min-h-screen">
          <Sidebar userEmail={user?.email ?? null} />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
