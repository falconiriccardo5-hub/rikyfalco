export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4" aria-busy="true" aria-label="Caricamento">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton h-44 w-full" />
      <div className="skeleton h-64 w-full" />
      <div className="skeleton h-64 w-full" />
    </div>
  );
}
