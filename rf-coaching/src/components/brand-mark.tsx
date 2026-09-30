export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="relative grid place-items-center rounded-[9px] bg-gradient-to-br from-accent to-[#4c1d95] shadow-[0_0_20px_-2px_rgba(139,92,246,.8)] ring-1 ring-white/20">
      <span className="text-[11px] font-semibold tracking-tight text-white">RF</span>
    </span>
  );
}
