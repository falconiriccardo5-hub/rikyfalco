"use client";
import { useEffect, useState, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./ui";
const Ctx = createContext<() => void>(() => {});
export const useCloseSheet = () => useContext(Ctx);
/** Bottom sheet on iPhone, side panel on desktop. */
export function Sheet({ trigger, title, children, triggerClassName }: { trigger: React.ReactNode; title: string; children: React.ReactNode; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>{trigger}</button>
      {mounted && open && createPortal(
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm [animation:fade_.3s_both]" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label={title}
            className={cx("absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[28px] border-t border-line-strong bg-[#0d0c14]/95 p-5 pb-[max(20px,env(safe-area-inset-bottom))] backdrop-blur-2xl [animation:sheet-up_.45s_var(--ease-out-soft)_both]",
              "sm:inset-y-3 sm:right-3 sm:left-auto sm:w-[460px] sm:rounded-[24px] sm:border sm:p-7 sm:[animation:sheet-in_.45s_var(--ease-out-soft)_both]")}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-medium tracking-tight">{title}</h3>
              <button onClick={() => setOpen(false)} className="press grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg" aria-label="Chiudi"><X size={16} /></button>
            </div>
            <Ctx.Provider value={() => setOpen(false)}>{children}</Ctx.Provider>
          </div>
        </div>, document.body)}
    </>
  );
}
