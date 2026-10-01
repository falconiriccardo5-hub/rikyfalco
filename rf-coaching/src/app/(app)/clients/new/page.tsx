import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { todayISO } from "@/lib/format";
import { NewClientForm } from "./form";
export const metadata = { title: "Nuovo cliente" };
export default async function NewClient() {
  await requireAdmin();
  return (
    <>
      <PageHeader eyebrow="Clienti / Nuovo" title="Nuovo cliente" />
      <NewClientForm today={todayISO()} />
    </>
  );
}
