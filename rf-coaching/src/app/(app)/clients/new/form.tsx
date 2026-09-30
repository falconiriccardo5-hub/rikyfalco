"use client";
import { useActionState, useState } from "react";
import { createClientAction } from "@/server/actions";
import { Button, Card, SectionLabel, LinkButton } from "@/components/ui";
import { ProgramFields } from "@/components/forms/program-fields";
import { ClientFields } from "@/components/forms/client-fields";
export function NewClientForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createClientAction, undefined);
  const [withProgram, setWithProgram] = useState(true);
  return (
    <form action={action} className="rise rise-1 space-y-8">
      <Card className="p-5 sm:p-8">
        <SectionLabel index={1} total={2}>Dati personali</SectionLabel>
        <ClientFields />
      </Card>
      <Card className="p-5 sm:p-8">
        <SectionLabel index={2} total={2} action={
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" name="with_program" checked={withProgram} onChange={(e) => setWithProgram(e.target.checked)} className="size-4 accent-[#8b5cf6]" /> Crea percorso
          </label>}>Percorso</SectionLabel>
        {withProgram ? <ProgramFields today={today} /> : <p className="text-sm text-muted">Potrai aggiungere il percorso dalla scheda cliente.</p>}
      </Card>
      {state?.error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <LinkButton href="/clients">Annulla</LinkButton>
        <Button variant="primary" disabled={pending}>{pending ? "Salvataggio…" : "Crea cliente"}</Button>
      </div>
    </form>
  );
}
