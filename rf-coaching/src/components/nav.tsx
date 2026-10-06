"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, CreditCard, CalendarDays, Bell, ClipboardList, Activity, HardDriveDownload, Settings, Plus, LogOut } from "lucide-react";
import { cx } from "./ui";
import { BrandMark } from "./brand-mark";
const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/clients", label: "Clienti", icon: Users },
  { href: "/visite", label: "Visita", icon: ClipboardList },
  { href: "/payments", label: "Pagamenti", icon: CreditCard },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/notifications", label: "Notifiche", icon: Bell },
];
const ADMIN = [
  { href: "/activity", label: "Attività", icon: Activity },
  { href: "/backup", label: "Backup", icon: HardDriveDownload },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];
export function Sidebar({ unread, name, signOut }: { unread: number; name: string; signOut: () => Promise<void> }) {
  const path = usePathname();
  const item = (it: (typeof MAIN)[number]) => {
    const active = path.startsWith(it.href);
    return (
      <Link key={it.href} href={it.href}
        className={cx("group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-300",
          active ? "bg-white/[.06] text-fg" : "text-muted hover:bg-white/[.03] hover:text-fg")}>
        {active && <span className="absolute -left-4 h-5 w-[2px] rounded-full bg-accent-2 shadow-[0_0_10px_2px_rgba(167,139,250,.8)]" />}
        <it.icon size={17} strokeWidth={1.6} className={cx(active && "text-accent-3")} />
        {it.label}
        {it.href === "/notifications" && unread > 0 && (
          <span className="ml-auto rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-[18px] text-white">{unread}</span>
        )}
      </Link>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r hairline bg-bg/60 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="mb-10 flex items-center gap-3 px-3">
        <BrandMark />
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold tracking-[.12em]">RICCARDO FALCONI</span>
          <span className="label block !text-[10px] !tracking-[.3em] text-accent-2">Coaching</span>
        </span>
      </Link>
      <Link href="/clients/new" className="press mb-6 flex h-10 items-center justify-center gap-2 rounded-full bg-fg text-sm font-medium text-bg transition hover:shadow-[0_0_30px_-4px_rgba(167,139,250,.8)]">
        <Plus size={16} /> Nuovo cliente
      </Link>
      <nav className="space-y-1">{MAIN.map(item)}</nav>
      <p className="label mt-8 mb-2 px-3 text-dim">Admin</p>
      <nav className="space-y-1">{ADMIN.map(item)}</nav>
      <div className="mt-auto flex items-center gap-3 rounded-xl border hairline p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{name}</p>
          <p className="label !text-[10px]">Admin</p>
        </div>
        <form action={signOut}><button title="Esci" className="press grid size-8 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-fg"><LogOut size={15} /></button></form>
      </div>
    </aside>
  );
}
export function MobileNav({ unread }: { unread: number }) {
  const path = usePathname();
  const tabs = [MAIN[0], MAIN[1], { href: "/clients/new", label: "Nuovo", icon: Plus }, MAIN[3], { href: "/more", label: "Altro", icon: Settings }];
  return (
    <nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 lg:hidden">
      <div className="glass flex items-center justify-around !rounded-[26px] bg-bg/70 px-2 py-2 shadow-[0_20px_60px_-10px_rgba(0,0,0,.8)]">
        {tabs.map((t) => {
          const isNew = t.href === "/clients/new";
          const active = !isNew && (t.href === "/more" ? ["/more", "/visite", "/calendar", "/notifications", "/activity", "/backup", "/settings"].some((p) => path.startsWith(p)) : path.startsWith(t.href) && !path.startsWith("/clients/new"));
          if (isNew)
            return (
              <Link key={t.href} href={t.href} aria-label="Nuovo cliente" className="press grid size-12 place-items-center rounded-full bg-gradient-to-br from-accent-2 to-accent text-white shadow-[0_0_24px_-2px_rgba(139,92,246,.9)]">
                <Plus size={22} />
              </Link>
            );
          return (
            <Link key={t.href} href={t.href} className={cx("press relative flex h-12 w-16 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] transition-colors", active ? "text-fg" : "text-dim")}>
              <t.icon size={20} strokeWidth={active ? 2 : 1.6} className={cx(active && "text-accent-3")} />
              {t.label}
              {t.href === "/more" && unread > 0 && <span className="absolute top-1.5 right-4 size-2 rounded-full bg-accent-2 shadow-[0_0_8px_rgba(167,139,250,1)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
export function MobileTop() {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b hairline bg-bg/70 px-5 pt-[max(14px,env(safe-area-inset-top))] pb-3.5 backdrop-blur-xl lg:hidden">
      <BrandMark size={26} />
      <span className="text-[12px] font-semibold tracking-[.14em]">RICCARDO FALCONI <span className="text-accent-2">· COACHING</span></span>
    </div>
  );
}
