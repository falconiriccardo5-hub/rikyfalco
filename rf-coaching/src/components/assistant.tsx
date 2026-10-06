"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { cx } from "./ui";

type Msg = { role: "user" | "assistant"; text: string; links?: { label: string; href: string }[]; error?: boolean };

const HINTS = [
  "Chi deve ancora pagare?",
  "Quanto ho incassato questo mese?",
  "Che appuntamenti ho oggi?",
  "Quali percorsi stanno per scadere?",
];

const FAB = {
  background: "radial-gradient(circle at 30% 25%, #c4b5fd, #8b5cf6 45%, #5b21b6)",
  border: "1px solid rgb(255 255 255 / .25)",
  boxShadow: "inset 0 1px 0 rgb(255 255 255 / .35), 0 8px 24px -6px rgb(139 92 246 / .75)",
};

/** Assistente fluttuante (in basso a destra). Interroga /api/assistant, che legge i dati dell'app. */
export function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setText("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, res.ok
        ? { role: "assistant", text: data.text, links: data.links }
        : { role: "assistant", text: data.error ?? "Qualcosa è andato storto.", error: true }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Non riesco a raggiungere l'app. Controlla la connessione.", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)} aria-label="Apri l'assistente" style={FAB}
        className={cx("press fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-40 grid size-14 place-items-center rounded-full text-white transition lg:bottom-8", open && "hidden")}>
        <Sparkles size={23} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ animation: "fade .2s var(--ease-out-soft)" }}>
          <button aria-label="Chiudi" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="glass relative flex h-[82dvh] w-full max-w-lg flex-col overflow-hidden !rounded-b-none sm:h-[70dvh] sm:!rounded-b-[20px]"
            style={{ animation: "sheet-up .3s var(--ease-out-soft)" }}>
            <div className="flex items-center gap-3 border-b hairline px-5 py-4">
              <span style={FAB} className="grid size-8 place-items-center rounded-full text-white"><Sparkles size={15} /></span>
              <span className="flex-1 text-[15px] font-medium">Assistente</span>
              <button onClick={() => setOpen(false)} className="press grid size-8 place-items-center rounded-full text-dim hover:text-fg"><X size={17} /></button>
            </div>

            <div ref={list} className="flex-1 space-y-3 overflow-y-auto p-5">
              {msgs.length === 0 && (
                <>
                  <p className="text-[15px] text-muted">Chiedimi dei tuoi clienti, dei pagamenti o dell&apos;agenda.</p>
                  <div className="space-y-2 pt-2">
                    {HINTS.map((h) => (
                      <button key={h} onClick={() => send(h)} className="press block w-full rounded-2xl border hairline px-4 py-3 text-left text-[14px] text-muted transition hover:border-line-strong hover:text-fg">
                        {h}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cx("max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-line",
                    m.role === "user" ? "bg-accent/25 ring-1 ring-accent/30" : m.error ? "bg-danger/10 text-danger ring-1 ring-danger/20" : "border hairline bg-white/[.03]")}>
                    {m.text}
                    {m.links && m.links.length > 0 && (
                      <span className="mt-3 flex flex-wrap gap-2">
                        {m.links.map((l) => (
                          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="press rounded-full border border-line px-3 py-1.5 text-[13px] text-accent-3 hover:bg-white/5">
                            {l.label}
                          </Link>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="rounded-2xl border hairline bg-white/[.03] px-4 py-3"><Loader2 size={16} className="animate-spin text-accent-3" /></div></div>}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-end gap-2 border-t hairline p-3">
              <textarea
                value={text} onChange={(e) => setText(e.target.value)} rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                placeholder="Scrivi una domanda…"
                className="field max-h-28 flex-1 resize-none !py-3" />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Invia" style={FAB}
                className="press grid size-11 shrink-0 place-items-center rounded-full text-white disabled:opacity-40">
                <ArrowUp size={19} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
