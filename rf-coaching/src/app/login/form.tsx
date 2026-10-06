"use client";
import { useActionState } from "react";
import { signIn } from "@/server/actions";
import { Button, Field } from "@/components/ui";
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email"><input name="email" type="email" autoComplete="email" required className="field" /></Field>
      <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className="field" /></Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button variant="primary" className="w-full" disabled={pending}>{pending ? "Accesso…" : "Accedi"}</Button>
    </form>
  );
}
