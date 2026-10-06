"use client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Sheet } from "./sheet";
import { ActionForm, ActButton } from "./forms/action-form";
import { AppointmentFields } from "./forms/appointment-fields";
import { cx } from "./ui";
import * as A from "@/server/actions";
const pill = "press inline-flex items-center gap-2 rounded-full border border-line transition hover:bg-white/5";
type Appt = { id: string; client_id: string | null; starts_at: string; ends_at: string; type: string; notes: string | null };
export function NewAppointment({ clients, clientId, today, label = "Appuntamento", primary }: { clients?: { id: string; name: string }[]; clientId?: string; today: string; label?: string; primary?: boolean }) {
  return (
    <Sheet title="Nuovo appuntamento" triggerClassName={cx(pill, primary ? "h-11 border-transparent bg-fg px-5 text-sm font-medium text-bg hover:bg-white" : "h-8 px-3 text-[13px]")} trigger={<><Plus size={14} /> {label}</>}>
      <ActionForm action={A.createAppointmentAction} submit="Crea appuntamento"><AppointmentFields clients={clients} fixedClientId={clientId} today={today} /></ActionForm>
    </Sheet>
  );
}
export function EditAppointment({ a, clients, today }: { a: Appt; clients?: { id: string; name: string }[]; today: string }) {
  return (
    <div className="flex shrink-0 gap-1.5">
      <Sheet title="Modifica appuntamento" triggerClassName="press grid size-8 place-items-center rounded-full border border-line text-muted hover:text-fg" trigger={<Pencil size={13} />}>
        <ActionForm action={A.updateAppointmentAction.bind(null, a.id)}><AppointmentFields a={a} clients={clients} today={today} /></ActionForm>
      </Sheet>
      <ActButton act={() => A.deleteAppointmentAction(a.id)} confirm="Eliminare questo appuntamento?" className="press grid size-8 place-items-center rounded-full border border-line text-muted hover:text-danger"><Trash2 size={13} /></ActButton>
    </div>
  );
}
