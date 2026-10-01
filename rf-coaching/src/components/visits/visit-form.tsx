"use client";
import { useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Badge, Button, cx } from "@/components/ui";
import type { ActionState } from "@/server/actions";
import { evalFormula, type Answer, type AnswerValue, type VisitAnswers, type VisitField, type VisitSection } from "@/lib/visit-template";

// Modulo visita: lo stesso componente per il coach (tutte le sezioni) e per il cliente (solo le sue).
export function VisitForm({ sections, initial, readOnly, onSave, actions, standalone }: {
  sections: VisitSection[];
  standalone?: boolean; // pagina senza menu in basso (link del cliente)
  initial: VisitAnswers;
  readOnly?: boolean;
  onSave: (answers: VisitAnswers, final: boolean) => Promise<ActionState>;
  actions: { draft?: string; final: string; confirmFinal?: string };
}) {
  const [answers, setAnswers] = useState<VisitAnswers>(initial);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  const computed = useMemo(() => {
    const num = (id: string) => {
      const v = answers[id]?.value;
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
      return Number.isFinite(n) ? n : null;
    };
    const out: Record<string, number | null> = {};
    const fs = sections.flatMap((s) => s.fields).filter((f) => f.type === "computed" && f.formula);
    for (let pass = 0; pass < fs.length; pass++)
      for (const f of fs) out[f.id] = evalFormula(f.formula!, (id) => (id in out ? out[id] : num(id)));
    return out;
  }, [answers, sections]);

  const set = (id: string, patch: Answer) => {
    setAnswers((a) => ({ ...a, [id]: { ...a[id], ...patch } }));
    setDirty(true); setState(undefined);
  };
  const save = (final: boolean) => {
    if (final && actions.confirmFinal && !window.confirm(actions.confirmFinal)) return;
    start(async () => {
      const res = await onSave(answers, final);
      setState(res);
      if (res?.ok) setDirty(false);
    });
  };

  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <details key={s.id} open className="glass group overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <span className="flex items-center gap-3">
              <span className="label text-dim">[ {String(i + 1).padStart(2, "0")} ]</span>
              <span className="text-[15px] font-medium tracking-tight">{s.title}</span>
            </span>
            <Badge tone={s.who === "cliente" ? "blue" : "violet"}>{s.who === "cliente" ? "Cliente" : "Coach"}</Badge>
          </summary>
          <div className="space-y-5 border-t hairline px-5 py-5 sm:px-6">
            {s.fields.map((f) => (
              <FieldInput key={f.id} f={f} a={answers[f.id]} computed={computed[f.id]} readOnly={readOnly} onChange={(p) => set(f.id, p)} />
            ))}
          </div>
        </details>
      ))}
      {!readOnly && (
        <div className={cx("sticky z-20 lg:bottom-6", standalone ? "bottom-[max(12px,env(safe-area-inset-bottom))]" : "bottom-[calc(env(safe-area-inset-bottom)+92px)]")}>
          <div className="glass flex flex-wrap items-center gap-3 !bg-[#0c0b12]/95 px-4 py-3 shadow-[0_20px_60px_-10px_rgba(0,0,0,.8)] backdrop-blur-xl">
            <p className="min-w-0 flex-1 text-sm text-muted">
              {state?.error ? <span className="text-danger">{state.error}</span>
                : state?.ok ? <span className="inline-flex items-center gap-1.5 text-ok"><Check size={15} /> Salvato</span>
                : dirty ? "Modifiche non salvate" : "Nessuna modifica"}
            </p>
            {actions.draft && <Button type="button" size="sm" disabled={pending} onClick={() => save(false)}>{pending ? "Salvataggio…" : actions.draft}</Button>}
            <Button type="button" size="sm" variant="primary" disabled={pending} onClick={() => save(true)}>{actions.final}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({ f, a, computed, readOnly, onChange }: {
  f: VisitField; a?: Answer; computed?: number | null; readOnly?: boolean; onChange: (p: Answer) => void;
}) {
  const v = a?.value;
  const id = `f-${f.id}`;
  const label = (
    <label htmlFor={id} className="block text-[14px] leading-snug">
      {f.label}{f.unit && f.type !== "computed" && <span className="text-dim"> ({f.unit})</span>}
      {f.hint && <span className="mt-1 block text-xs text-muted">{f.hint}</span>}
    </label>
  );
  const setValue = (value: AnswerValue) => onChange({ value });
  let input: React.ReactNode;
  switch (f.type) {
    case "computed":
      return (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-accent/[.06] px-4 py-3">
          <span className="text-[14px] text-muted">{f.label}</span>
          <span className="numeral text-lg">{computed ?? "—"}{computed != null && f.unit && <span className="ml-1 text-xs text-muted">{f.unit}</span>}</span>
        </div>
      );
    case "textarea":
      input = <textarea id={id} rows={3} disabled={readOnly} value={typeof v === "string" ? v : ""} onChange={(e) => setValue(e.target.value)} className="field resize-y" />;
      break;
    case "select":
      input = (
        <select id={id} disabled={readOnly} value={typeof v === "string" ? v : ""} onChange={(e) => setValue(e.target.value || null)} className="field">
          <option value="">—</option>
          {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case "multiselect": {
      const sel = Array.isArray(v) ? v : [];
      input = (
        <div id={id} className="flex flex-wrap gap-2">
          {f.options!.map((o) => {
            const on = sel.includes(o);
            return (
              <button key={o} type="button" disabled={readOnly} aria-pressed={on}
                onClick={() => setValue(on ? sel.filter((x) => x !== o) : [...sel, o])}
                className={cx("press min-h-9 rounded-full border px-3.5 text-[13px] transition",
                  on ? "border-accent-2/60 bg-accent/20 text-fg" : "border-line text-muted hover:text-fg")}>
                {o}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "score":
      input = (
        <div>
          <div id={id} className="flex gap-2" role="radiogroup" aria-label={f.label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={v === n} disabled={readOnly} onClick={() => setValue(v === n ? null : n)}
                className={cx("press grid size-11 place-items-center rounded-full border text-sm font-medium transition",
                  v === n ? "border-accent-2 bg-accent text-white shadow-[0_0_18px_-2px_rgba(139,92,246,.9)]" : "border-line text-muted hover:text-fg")}>
                {n}
              </button>
            ))}
          </div>
          {(f.low || f.high) && <p className="mt-2 text-xs text-muted">1 = {f.low} · 5 = {f.high}</p>}
        </div>
      );
      break;
    default:
      input = (
        <input id={id} disabled={readOnly} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
          inputMode={f.type === "number" ? "decimal" : undefined} step={f.step ?? "any"}
          value={v == null ? "" : String(v)}
          onChange={(e) => setValue(f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
          className="field" />
      );
  }
  return (
    <div className={cx("space-y-2.5", f.detailOf && "border-l-2 border-line pl-4")}>
      {label}
      {input}
      {f.notes && (
        <input aria-label={`Note aggiuntive: ${f.label}`} placeholder="Note aggiuntive" disabled={readOnly}
          value={a?.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} className="field !py-2 text-sm" />
      )}
    </div>
  );
}
