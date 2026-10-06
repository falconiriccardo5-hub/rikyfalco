import { Card } from "./ui";
export function NotConfigured({ items }: { items: { name: string; status: string }[] }) {
  return (
    <Card className="divide-y divide-line">
      {items.map((i) => (
        <div key={i.name} className="flex items-center justify-between gap-4 px-5 py-4">
          <span>{i.name}</span>
          <span className="flex items-center gap-2 text-[13px] text-muted"><span className="size-1.5 rounded-full bg-dim" />{i.status}</span>
        </div>
      ))}
    </Card>
  );
}
