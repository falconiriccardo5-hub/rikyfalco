import Link from "next/link";
import clsx from "clsx";
import type { Tone } from "@/lib/format";
export const cx = clsx;
const TONES: Record<Tone, string> = {
  green: "text-ok bg-ok/10 ring-ok/20", amber: "text-warn bg-warn/10 ring-warn/20", orange: "text-orange bg-orange/10 ring-orange/20",
  red: "text-danger bg-danger/10 ring-danger/25", blue: "text-info bg-info/10 ring-info/20", violet: "text-accent-3 bg-accent/15 ring-accent/30",
  muted: "text-muted bg-white/5 ring-white/10",
};
export const DOT: Record<Tone, string> = { green: "bg-ok", amber: "bg-warn", orange: "bg-orange", red: "bg-danger", blue: "bg-info", violet: "bg-accent-2", muted: "bg-dim" };
export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>
      <span className={cx("size-1.5 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}
export function Card({ className, children, glow }: { className?: string; children: React.ReactNode; glow?: boolean }) {
  return <div className={cx("glass relative", glow && "glow", className)}>{children}</div>;
}
export function SectionLabel({ index, total, children, action }: { index?: number; total?: number; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {index != null && <span className="label text-dim">[ {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")} ]</span>}
        <h2 className="text-[15px] font-medium tracking-tight">{children}</h2>
      </div>
      {action}
    </div>
  );
}
type BtnProps = { variant?: "primary" | "ghost" | "danger"; size?: "sm" | "md"; className?: string; children: React.ReactNode };
const btn = (v: BtnProps["variant"] = "ghost", s: BtnProps["size"] = "md") =>
  cx(
    "press inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 disabled:opacity-50 whitespace-nowrap",
    s === "sm" ? "h-8 px-3.5 text-[13px]" : "h-11 px-5 text-sm",
    v === "primary" && "bg-fg text-bg hover:bg-white hover:shadow-[0_0_30px_-4px_rgba(167,139,250,.8)]",
    v === "ghost" && "border border-line bg-white/[.03] text-fg hover:border-line-strong hover:bg-white/[.06]",
    v === "danger" && "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15",
  );
export function Button({ variant, size, className, children, ...rest }: BtnProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cx(btn(variant, size), className)} {...rest}>{children}</button>;
}
export function LinkButton({ variant, size, className, children, href }: BtnProps & { href: string }) {
  return <Link href={href} className={cx(btn(variant, size), className)}>{children}</Link>;
}
export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="label mb-3">{eyebrow}</p>}
        <h1 className="text-[32px] leading-none font-medium tracking-[-0.035em] sm:text-[40px]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label mb-2 block">{label}</span>
      {children}
    </label>
  );
}
export function Progress({ value, max, tone = "violet" }: { value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[.06]">
      <div className={cx("h-full rounded-full transition-all duration-700", tone === "violet" ? "bg-gradient-to-r from-accent to-accent-3 shadow-[0_0_12px_rgba(167,139,250,.7)]" : DOT[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
export function Avatar({ first, last, size = 40 }: { first: string; last: string; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/40 to-white/5 text-[13px] font-medium ring-1 ring-white/10">
      {first[0]}{last[0]}
    </span>
  );
}
