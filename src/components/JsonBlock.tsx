/** Read-only JSON viewer for agent inputs and outputs. */
export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 max-h-[28rem] overflow-auto rounded-lg border border-line bg-ink/70 p-3 font-mono text-[11px] leading-relaxed text-neutral-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
