import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
/** Every admin page/action goes through here. RLS enforces the same rule in the DB. */
export async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id,name,email,role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login?e=forbidden");
  }
  return { supabase, user, profile };
}
