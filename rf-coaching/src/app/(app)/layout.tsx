import { requireAdmin } from "@/lib/auth";
import { Sidebar, MobileNav, MobileTop } from "@/components/nav";
import { RealtimeSync } from "@/components/realtime";
import { signOut } from "@/server/actions";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireAdmin();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return (
    <div className="relative z-10">
      <Sidebar unread={count ?? 0} name={profile.name || profile.email} signOut={signOut} />
      <MobileTop />
      <div className="lg:pl-[248px]"><main className="safe-b mx-auto max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-12 lg:pt-12">{children}</main></div>
      <MobileNav unread={count ?? 0} />
      <RealtimeSync />
    </div>
  );
}
