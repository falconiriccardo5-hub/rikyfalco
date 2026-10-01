import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { currentPrograms, type ClientRow, type ProgramRow } from "@/server/queries";
import { PageHeader, LinkButton } from "@/components/ui";
import { ClientsTable, type Row } from "./table";
export const metadata = { title: "Clienti" };
export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { supabase } = await requireAdmin();
  const { f } = await searchParams;
  const [{ data: clients }, { data: programs }] = await Promise.all([
    supabase.from("clients").select("*").order("last_name"),
    supabase.from("program_overview").select("*"),
  ]);
  const cur = currentPrograms((programs ?? []) as ProgramRow[]);
  const rows: Row[] = ((clients ?? []) as ClientRow[]).map((c) => {
    const p = cur.get(c.id);
    return {
      id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, archived: !!c.archived_at,
      program: p ? { type: p.type, duration: p.duration, start_date: p.start_date, end_date: p.end_date, status: p.status, days_left: p.days_left, payment_state: p.payment_state, paid: p.installments_paid, total: p.installments_count } : null,
    };
  });
  return (
    <>
      <PageHeader eyebrow={`${rows.filter((r) => !r.archived).length} clienti`} title="Clienti">
        <LinkButton href="/clients/new" variant="primary"><Plus size={16} /> Nuovo cliente</LinkButton>
      </PageHeader>
      <ClientsTable rows={rows} initialFilter={f ?? "tutti"} />
    </>
  );
}
