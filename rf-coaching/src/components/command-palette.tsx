"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Users, CalendarDays, CreditCard, Plus, ClipboardList } from "lucide-react";
import { cx } from "./ui";

export type PaletteClient = { id: string; first_name: string; last_name: string };

const ACTIONS = [
  { href: "/clients/new", label: "Nuovo cliente", icon: Plus },
  { href: "/clients", label: "Clienti", icon: Users },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/payments", label: "Pagamenti", icon: CreditCard },
  { href: "/visite", label: "Visita", icon: ClipboardList },
];

/** Ricerca rapida: apre con l'icona nell'intestazione o con ⌘K / Ctrl+K. */
export function CommandPalette({ clients }: { clients: PaletteClient[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) { setQ(""); requestAnimationFrame(() => input.current?.focus()); }
  }, [open]);

  const term = q.trim().toLowerCase();
  const people = useMemo(
    () => (term ? clients.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(term)).slice(0, 8) : []),
    [clients, term],
  );
  const actions = term ? ACTIONS.filter((a) => a.label.toLowerCase().includes(term)) : ACTIONS;

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Cerca" className="press grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-fg">
        <Search size={20} strokeWidth={1.7} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" style={{ animation: "fade .2s var(--ease-out-soft)" }}>
          <button aria-label="Chiudi" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="glass relative w-full max-w-lg overflow-hidden" style={{ animation: "sheet-in .25s var(--ease-out-soft)" }}>
            <div className="flex items-center gap-3 border-b hairline px-4">
              <Search size={17} className="shrink-0 text-dim" />
              <input
                ref={input} value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key !== "Enter") return; const c = people[0]; if (c) return go(`/clients/${c.id}`); const a = actions[0]; if (a) go(a.href); }}
                placeholder="Cerca un cliente o una pagina…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-dim"
              />
              <button onClick={() => setOpen(false)} className="press grid size-8 shrink-0 place-items-center rounded-full text-dim hover:text-fg"><X size={16} /></button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {people.length > 0 && (
                <>
                  <p className="label px-3 pt-2 pb-1 !text-[10px]">Clienti</p>
                  {people.map((c) => (
                    <Link key={c.id} href={`/clients/${c.id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[.05]">
                      <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-accent/40 to-white/5 text-[12px] ring-1 ring-white/10">
                        {c.first_name[0]}{c.last_name[0]}
                      </span>
                      <span className="text-[15px]">{c.first_name} {c.last_name}</span>
                    </Link>
                  ))}
                </>
              )}
              {actions.length > 0 && (
                <>
                  <p className="label px-3 pt-3 pb-1 !text-[10px]">Vai a</p>
                  {actions.map((a) => (
                    <Link key={a.href} href={a.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[.05]">
                      <a.icon size={17} strokeWidth={1.6} className="text-accent-3" />
                      <span className="text-[15px]">{a.label}</span>
                    </Link>
                  ))}
                </>
              )}
              {term && people.length === 0 && actions.length === 0 && (
                <p className={cx("px-3 py-8 text-center text-sm text-muted")}>Nessun risultato per “{q}”.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
