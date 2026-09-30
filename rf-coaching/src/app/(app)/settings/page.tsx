import { requireAdmin } from "@/lib/auth";
import { PageHeader, SectionLabel, Card, Badge, cx } from "@/components/ui";
import { googleStatus, googleConfigured } from "@/server/integrations/google";
import { emailProvider } from "@/server/integrations/email";
import { fmtDateTime } from "@/lib/format";
import { ReminderForm, TemplateForm, PasswordForm, TokenCreate, GoogleButtons, RevokeToken, SignOutAll } from "./widgets";
export const metadata = { title: "Impostazioni" };
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex items-center justify-between gap-4 px-5 py-4"><span className="text-muted">{k}</span><span className="text-right">{v}</span></div>;
const Dot = ({ on }: { on: boolean }) => <span className={cx("mr-2 inline-block size-2 rounded-full", on ? "bg-ok shadow-[0_0_8px_rgba(74,222,128,.8)]" : "bg-dim")} />;
const TPL: Record<string, string> = { rinnovo: "Rinnovo percorso", rata: "Rata in scadenza", scadenza: "Percorso scaduto", manuale: "Email manuale (bozza)" };
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string; msg?: string }> }) {
  const { supabase, profile } = await requireAdmin();
  const sp = await searchParams;
  const [{ data: st }, { data: tpls }, { data: tokens }, gs] = await Promise.all([
    supabase.from("settings").select("key,value"),
    supabase.from("email_templates").select("*"),
    supabase.from("api_tokens").select("id,name,prefix,created_at,last_used_at,revoked_at").order("created_at", { ascending: false }),
    googleStatus(supabase),
  ]);
  const s = Object.fromEntries((st ?? []).map((r) => [r.key, r.value]));
  const provider = emailProvider();
  const job = s.last_daily_job as { finished_at?: string } | undefined;
  const gMsg: Record<string, [string, "green" | "red"]> = {
    connected: ["Google collegato", "green"], denied: ["Accesso negato su Google", "red"], invalid_state: ["Sessione OAuth scaduta, riprova", "red"],
    not_configured: ["Credenziali Google non configurate sul server", "red"], error: [`Errore Google: ${sp.msg ?? ""}`, "red"],
  };
  return (
    <>
      <PageHeader eyebrow="Configurazione" title="Impostazioni" />
      <div className="space-y-12">
        <section><SectionLabel index={1} total={6}>Profilo e sicurezza</SectionLabel>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="divide-y divide-line">
              <Row k="Nome" v={profile.name} /><Row k="Email" v={profile.email} /><Row k="Ruolo" v="Admin" />
              <div className="flex items-center justify-between px-5 py-4"><span className="text-muted">Sessioni attive</span><SignOutAll /></div>
            </Card>
            <Card className="p-5"><p className="label mb-4">Cambia password</p><PasswordForm /></Card>
          </div>
        </section>
        <section><SectionLabel index={2} total={6}>Notifiche e automazioni</SectionLabel>
          <Card className="p-5">
            <ReminderForm renewal={Number(s.renewal_reminder_days ?? 30)} payment={Number(s.payment_reminder_days ?? 7)} backup={String(s.backup_frequency ?? "daily")} />
            <p className="mt-4 text-[13px] text-muted">Job giornaliero alle 08:00 (reminder → email → backup → calendario).{job?.finished_at ? ` Ultima esecuzione: ${fmtDateTime(job.finished_at)}.` : " Non ancora eseguito."}</p>
          </Card>
        </section>
        <section id="google"><SectionLabel index={3} total={6}>Google</SectionLabel>
          <Card className="p-5">
            {sp.google && gMsg[sp.google] && <div className="mb-4"><Badge tone={gMsg[sp.google][1]}>{gMsg[sp.google][0]}</Badge></div>}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm">
                <p className="text-base"><Dot on={gs.connected} />Google Account {gs.connected ? "" : <span className="text-muted">· Non connesso</span>}</p>
                {gs.connected && (
                  <div className="mt-2 space-y-1 text-muted">
                    <p>{gs.drive ? "✓" : "✗"} Google Drive · {gs.calendar ? "✓" : "✗"} Google Calendar</p>
                    <p>Account: <span className="text-fg">{gs.email}</span></p>
                  </div>
                )}
                {!googleConfigured() && <p className="mt-2 text-muted">Google OAuth non configurato sul server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET mancanti).</p>}
              </div>
              <GoogleButtons connected={gs.connected} configured={googleConfigured()} />
            </div>
          </Card>
        </section>
        <section><SectionLabel index={4} total={6}>Email</SectionLabel>
          <Card className="mb-4 px-5 py-4 text-sm"><Dot on={!!provider} />{provider ? <>Provider: <b className="font-medium capitalize">{provider.name}</b> · mittente {process.env.EMAIL_FROM || "onboarding@resend.dev"}</> : <span className="text-muted">Email non configurata (manca la chiave API del provider)</span>}</Card>
          <div className="grid gap-3 lg:grid-cols-2">
            {["rinnovo", "rata", "scadenza", "manuale"].map((k) => {
              const t = tpls?.find((x) => x.key === k);
              return t ? <Card key={k} className="p-5"><TemplateForm k={k} title={TPL[k]} subject={t.subject} body={t.body} enabled={t.enabled} /></Card> : null;
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted">Variabili: {"{{nome}} {{cognome}} {{data_fine}} {{data_scadenza}} {{importo}}"}. Le email automatiche partono solo se il template è attivo.</p>
        </section>
        <section><SectionLabel index={5} total={6}>AI / API</SectionLabel>
          <Card className="p-5">
            <p className="text-sm text-muted">Token per far modificare i dati a Claude o ad altri assistenti tramite l&apos;API strutturata <code className="text-fg">/api/ai/v1</code>. Ogni modifica finisce in Attività con fonte &quot;AI Assistant&quot;.</p>
            <div className="mt-4"><TokenCreate /></div>
            {(tokens ?? []).length > 0 && (
              <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
                {(tokens ?? []).map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="font-medium">{t.name}</span><code className="text-muted">{t.prefix}…</code>
                    <span className="text-[12px] text-muted">{t.last_used_at ? `usato ${fmtDateTime(t.last_used_at)}` : "mai usato"}</span>
                    <span className="ml-auto">{t.revoked_at ? <Badge>Revocato</Badge> : <RevokeToken id={t.id} />}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
        <section><SectionLabel index={6} total={6}>Stato server</SectionLabel>
          <Card className="divide-y divide-line text-sm">
            <Row k="Job automatici (service key)" v={<><Dot on={!!process.env.SUPABASE_SERVICE_ROLE_KEY} />{process.env.SUPABASE_SERVICE_ROLE_KEY ? "Configurato" : "Non configurato"}</>} />
            <Row k="Cron secret" v={<><Dot on={!!process.env.CRON_SECRET} />{process.env.CRON_SECRET ? "Configurato" : "Non configurato"}</>} />
            <Row k="Cifratura token" v={<><Dot on={!!process.env.TOKEN_ENCRYPTION_KEY} />{process.env.TOKEN_ENCRYPTION_KEY ? "Configurata" : "Non configurata"}</>} />
          </Card>
        </section>
      </div>
    </>
  );
}
