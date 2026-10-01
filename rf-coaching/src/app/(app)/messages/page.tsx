import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadOverview, currentPrograms } from "@/server/queries";
import { PageHeader, Card, Badge, Empty, cx } from "@/components/ui";
import { DRAFT, DRAFT_LABEL, waLink, type DraftKind } from "@/lib/whatsapp";
import { eur, fmtDateLong, type Tone } from "@/lib/format";

export const metadata = { title: "Messaggi da inviare" };

type Draft = { key: string; kind: DraftKind; tone: Tone; clientId: string; name: string; phone: string | null; why: string; text: string };

export default async function Messages() {
  const { supabase } = await requireAdmin();
  const { programs, openPayments, appointments, today } = await loadOverview(supabase);
  const { data: contacts } = await supabase.from("clients").select("id,phone").is("archived_at", null);
  const phones = new Map((contacts ?? []).map((c) => [c.id as string, (c.phone as string | null) ?? null]));
  const current = [...currentPrograms(programs).values()];

  const drafts: Draft[] = [
    ...openPayments.filter((p) => p.status === "scaduto").map((p): Draft => ({
      key: "s" + p.id, kind: "sollecito", tone: "red", clientId: p.client_id, name: `${p.first_name} ${p.last_name}`, phone: phones.get(p.client_id) ?? null,
      why: `Rata di ${eur(p.amount)} scaduta il ${fmtDateLong(p.due_date)}`,
      text: DRAFT.sollecito({ name: p.first_name, amount: p.amount, date: p.due_date }),
    })),
    ...openPayments.filter((p) => p.status === "in_attesa").map((p): Draft => ({
      key: "r" + p.id, kind: "promemoria_rata", tone: "orange", clientId: p.client_id, name: `${p.first_name} ${p.last_name}`, phone: phones.get(p.client_id) ?? null,
      why: `Rata di ${eur(p.amount)} in scadenza il ${fmtDateLong(p.due_date)}`,
      text: DRAFT.promemoria_rata({ name: p.first_name, amount: p.amount, date: p.due_date }),
    })),
    ...appointments.filter((a) => a.clients && a.client_id && a.starts_at.slice(0, 10) <= today).map((a): Draft => ({
      key: "l" + a.id, kind: "promemoria_lezione", tone: "violet", clientId: a.client_id, name: `${a.clients!.first_name} ${a.clients!.last_name}`, phone: phones.get(a.client_id) ?? null,
      why: "Lezione di oggi",
      text: DRAFT.promemoria_lezione({ name: a.clients!.first_name, when: a.starts_at }),
    })),
    ...current.filter((p) => p.status === "in_scadenza" || p.status === "scaduto").map((p): Draft => ({
      key: "n" + p.id, kind: "rinnovo", tone: "amber", clientId: p.client_id, name: `${p.first_name} ${p.last_name}`, phone: phones.get(p.client_id) ?? null,
      why: `Percorso in chiusura il ${fmtDateLong(p.end_date)}`,
      text: DRAFT.rinnovo({ name: p.first_name, date: p.end_date }),
    })),
  ];

  return (
    <>
      <PageHeader title="Messaggi da inviare" eyebrow={`${drafts.length} in coda`} />
      {drafts.length === 0 ? <Empty>Nessun messaggio da mandare. Sei in pari con tutti.</Empty> : (
        <div className="space-y-3">
          {drafts.map((d) => {
            const wa = waLink(d.phone, d.text);
            return (
              <Card key={d.key} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/clients/${d.clientId}`} className="text-[17px] font-medium tracking-tight hover:text-accent-3">{d.name}</Link>
                    <p className="mt-0.5 text-[13px] text-muted">{d.why}</p>
                  </div>
                  <Badge tone={d.tone}>{DRAFT_LABEL[d.kind]}</Badge>
                </div>
                <p className="mt-4 rounded-2xl border hairline bg-white/[.02] p-4 text-[14px] leading-relaxed text-muted">{d.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noreferrer" className="press inline-flex h-11 items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-5 text-sm font-medium text-ok transition hover:bg-ok/15">
                      <MessageCircle size={16} /> Apri WhatsApp
                    </a>
                  ) : (
                    <span className={cx("inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm text-dim")}>
                      <Phone size={16} /> Numero mancante
                    </span>
                  )}
                  <Link href={`/clients/${d.clientId}`} className="press inline-flex h-11 items-center rounded-full border border-line bg-white/[.03] px-5 text-sm transition hover:border-line-strong">
                    Scheda cliente
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
