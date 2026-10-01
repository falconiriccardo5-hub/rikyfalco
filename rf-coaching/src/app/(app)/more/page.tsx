import Link from "next/link";
import { CreditCard, Bell, MessageSquare, BarChart3, Activity, HardDriveDownload, Settings, LogOut, ChevronRight } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { signOut } from "@/server/actions";
const items = [
  { href: "/payments", label: "Pagamenti", icon: CreditCard },
  { href: "/notifications", label: "Notifiche", icon: Bell },
  { href: "/messages", label: "Messaggi da inviare", icon: MessageSquare },
  { href: "/reports", label: "Report mensile", icon: BarChart3 },
  { href: "/activity", label: "Attività", icon: Activity },
  { href: "/backup", label: "Backup", icon: HardDriveDownload },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];
export default function More() {
  return (
    <>
      <PageHeader title="Altro" />
      <Card className="divide-y divide-line overflow-hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="flex h-14 items-center gap-4 px-5 transition hover:bg-white/[.03]">
            <i.icon size={18} strokeWidth={1.6} className="text-accent-3" /><span className="flex-1">{i.label}</span><ChevronRight size={16} className="text-dim" />
          </Link>
        ))}
      </Card>
      <form action={signOut} className="mt-6"><button className="press flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line text-muted"><LogOut size={16} /> Esci</button></form>
    </>
  );
}
