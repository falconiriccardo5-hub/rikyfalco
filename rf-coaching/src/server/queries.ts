import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO, addDaysISO } from "@/lib/format";
export type ProgramRow = {
  id: string; client_id: string; type: string; duration: string; start_date: string; end_date: string; total_price: number;
  lessons_total: number; lessons_completed: number; lessons_remaining: number; installments: number; payment_method: string;
  manual_status: string | null; status: string; days_left: number; paid_total: number; installments_count: number;
  installments_paid: number; installments_overdue: number; payment_state: string; first_name: string; last_name: string;
  client_email: string | null; archived_at: string | null;
};
export type PaymentRow = {
  id: string; client_id: string; program_id: string | null; amount: number; due_date: string; paid_date: string | null;
  paid_amount: number | null; method: string | null; status: string; days_to_due: number; first_name: string; last_name: string; notes: string | null;
};
export type ClientRow = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; birth_date: string | null; notes: string | null; archived_at: string | null; created_at: string };
/** Latest program per client = the "current" one. */
export function currentPrograms(programs: ProgramRow[]) {
  const map = new Map<string, ProgramRow>();
  for (const p of programs) {
    const cur = map.get(p.client_id);
    if (!cur || p.start_date > cur.start_date) map.set(p.client_id, p);
  }
  return map;
}
export async function loadOverview(sb: SupabaseClient) {
  const today = todayISO();
  const [programs, payments, appts] = await Promise.all([
    sb.from("program_overview").select("*").is("archived_at", null),
    sb.from("payment_overview").select("*").neq("status", "pagato").order("due_date"),
    sb.from("appointments").select("id,client_id,starts_at,ends_at,type,notes,clients(first_name,last_name)")
      .gte("starts_at", today + "T00:00:00").lt("starts_at", addDaysISO(today, 8) + "T00:00:00").order("starts_at"),
  ]);
  return {
    programs: (programs.data ?? []) as ProgramRow[],
    openPayments: (payments.data ?? []) as PaymentRow[],
    appointments: (appts.data ?? []) as unknown as { id: string; client_id: string; starts_at: string; ends_at: string; type: string; notes: string | null; clients: { first_name: string; last_name: string } | null }[],
    today,
  };
}
