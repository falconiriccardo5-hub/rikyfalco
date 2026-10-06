import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
/**
 * Service client for server-only jobs (cron, AI API). Bypasses RLS, so it is
 * never imported by client code and every write still goes through services.ts.
 * `source` is sent as a header and recorded by the audit trigger.
 */
export function adminClient(source: "cron" | "ai" | "system" = "system"): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-app-source": source } },
  });
}
