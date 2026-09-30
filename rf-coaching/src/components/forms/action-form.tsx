"use client";
import { useActionState, useEffect, useTransition } from "react";
import type { ActionState } from "@/server/actions";
import { Button } from "@/components/ui";
import { useCloseSheet } from "@/components/sheet";
export function ActionForm({ action, children, submit = "Salva", className }: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>; children: React.ReactNode; submit?: string; className?: string;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const close = useCloseSheet();
  useEffect(() => { if (state?.ok) close(); }, [state, close]);
  return (
    <form action={run} className={className ?? "space-y-5"}>
      {children}
      {state?.error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button variant="primary" className="w-full" disabled={pending}>{pending ? "Salvataggio…" : submit}</Button>
    </form>
  );
}
/** Small button that calls a server action (no form state). */
export function ActButton({ act, children, className, title, confirm }: { act: () => Promise<void>; children: React.ReactNode; className?: string; title?: string; confirm?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" title={title} disabled={pending} className={className}
      onClick={() => { if (confirm && !window.confirm(confirm)) return; start(() => act()); }}>
      {children}
    </button>
  );
}
