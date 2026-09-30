"use client";
import { useRouter } from "next/navigation";
import { VisitForm } from "@/components/visits/visit-form";
import type { VisitAnswers, VisitSection } from "@/lib/visit-template";
import { submitClientVisitAction } from "@/server/actions";

export function ClientVisitForm({ token, visitId, sections, initial }: { token: string; visitId: string; sections: VisitSection[]; initial: VisitAnswers }) {
  const router = useRouter();
  return (
    <VisitForm standalone sections={sections} initial={initial}
      onSave={async (answers, final) => {
        const res = await submitClientVisitAction(token, visitId, answers, final);
        if (final && res?.ok) router.refresh();
        return res;
      }}
      actions={{ draft: "Salva", final: "Invia a Riccardo", confirmFinal: "Inviare il modulo? Dopo l'invio non potrai più modificarlo." }} />
  );
}
