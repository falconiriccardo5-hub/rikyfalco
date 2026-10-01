"use client";
import { useState } from "react";
import { Field, cx } from "@/components/ui";
import { addMonthsISO, eur } from "@/lib/format";
const DUR: [string, string, number][] = [["3m", "3 mesi", 3], ["6m", "6 mesi", 6], ["12m", "12 mesi", 12], ["10l", "10 lezioni", 2]];
const LESSONS: Record<string, Record<string, number>> = { live: { "3m": 24, "6m": 48, "12m": 96, "10l": 10 }, misto: { "3m": 12, "6m": 24, "12m": 48, "10l": 10 }, online: { "3m": 0, "6m": 0, "12m": 0, "10l": 10 } };
function Segmented({ name, options, value, onChange }: { name: string; options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid rounded-2xl border border-line bg-white/[.02] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, l]) => (
        <button type="button" key={v} onClick={() => onChange(v)}
          className={cx("press h-10 rounded-xl text-[13px] transition-all duration-300", value === v ? "bg-white/10 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.1)]" : "text-muted hover:text-fg")}>{l}</button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
export function ProgramFields({ today }: { today: string }) {
  const [type, setType] = useState("misto");
  const [duration, setDuration] = useState("6m");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addMonthsISO(today, 6));
  const [lessons, setLessons] = useState(LESSONS.misto["6m"]);
  const [price, setPrice] = useState("");
  const [inst, setInst] = useState("1");
  const recompute = (t: string, d: string, s: string) => {
    const m = DUR.find((x) => x[0] === d)![2];
    setEnd(addMonthsISO(s, m)); setLessons(LESSONS[t][d]);
  };
  const perRata = Number(price) > 0 && Number(inst) > 0 ? Number(price) / Number(inst) : 0;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Tipologia" className="sm:col-span-2">
        <Segmented name="type" value={type} onChange={(v) => { setType(v); recompute(v, duration, start); }} options={[["live", "Live"], ["online", "Online"], ["misto", "Misto"]]} />
      </Field>
      <Field label="Durata" className="sm:col-span-2">
        <Segmented name="duration" value={duration} onChange={(v) => { setDuration(v); recompute(type, v, start); }} options={DUR.map(([v, l]) => [v, l])} />
      </Field>
      <Field label="Data inizio"><input type="date" name="start_date" required value={start} onChange={(e) => { setStart(e.target.value); recompute(type, duration, e.target.value); }} className="field" /></Field>
      <Field label="Data fine"><input type="date" name="end_date" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="field" /></Field>
      <Field label="Lezioni acquistate"><input type="number" name="lessons_total" min={0} max={500} value={lessons} onChange={(e) => setLessons(Number(e.target.value))} className="field" /></Field>
      <Field label="Prezzo totale (€)"><input type="number" name="total_price" min={0} step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="800" className="field" /></Field>
      <Field label="Numero rate"><input type="number" name="installments" min={1} max={24} value={inst} onChange={(e) => setInst(e.target.value)} className="field" /></Field>
      <Field label="Metodo di pagamento">
        <select name="payment_method" className="field" defaultValue="bonifico">
          <option value="bonifico">Bonifico</option><option value="contanti">Contanti</option><option value="carta">Carta</option><option value="paypal">PayPal</option><option value="altro">Altro</option>
        </select>
      </Field>
      {perRata > 0 && (
        <p className="rounded-2xl border border-accent/25 bg-accent/[.07] px-4 py-3 text-sm sm:col-span-2">
          {inst} {Number(inst) === 1 ? "rata" : "rate"} da <b className="font-medium">{eur(perRata)}</b> · prima scadenza il giorno di inizio, poi ogni mese
        </p>
      )}
    </div>
  );
}
