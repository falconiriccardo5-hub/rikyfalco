import { Field } from "@/components/ui";
type C = { first_name?: string; last_name?: string; email?: string | null; phone?: string | null; birth_date?: string | null; notes?: string | null };
export function ClientFields({ c = {} }: { c?: C }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nome"><input name="first_name" required defaultValue={c.first_name} autoComplete="off" className="field" /></Field>
      <Field label="Cognome"><input name="last_name" required defaultValue={c.last_name} autoComplete="off" className="field" /></Field>
      <Field label="Email"><input name="email" type="email" defaultValue={c.email ?? ""} autoComplete="off" className="field" /></Field>
      <Field label="Telefono"><input name="phone" type="tel" defaultValue={c.phone ?? ""} autoComplete="off" className="field" /></Field>
      <Field label="Data di nascita"><input name="birth_date" type="date" defaultValue={c.birth_date ?? ""} className="field" /></Field>
      <Field label="Note" className="sm:col-span-2"><textarea name="notes" rows={3} defaultValue={c.notes ?? ""} className="field resize-none" /></Field>
    </div>
  );
}
