import { requireAdmin } from "@/lib/auth";
import { snapshot, toCSV, toXLSX, ENTITIES, type Entity } from "@/server/backup";
/** GET /api/export?format=json|csv|xlsx&entity=clients|programs|payments|appointments|all */
export async function GET(req: Request) {
  const { supabase } = await requireAdmin();
  const q = new URL(req.url).searchParams;
  const format = q.get("format") ?? "json";
  const entity = (q.get("entity") ?? "all") as Entity | "all";
  if (entity !== "all" && !ENTITIES.includes(entity)) return new Response("entity non valida", { status: 400 });
  const snap = await snapshot(supabase);
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const name = `rf-coaching-${entity}-${day}`;
  const file = (body: BodyInit, type: string, ext: string) =>
    new Response(body, { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${name}.${ext}"`, "Cache-Control": "no-store" } });
  if (format === "json") return file(JSON.stringify(entity === "all" ? snap : snap[entity], null, 2), "application/json", "json");
  if (format === "csv") {
    if (entity === "all") return new Response("Per il CSV scegli una tabella", { status: 400 });
    return file(toCSV(snap[entity]), "text/csv; charset=utf-8", "csv");
  }
  if (format === "xlsx") {
    const sheets = entity === "all" ? Object.fromEntries(ENTITIES.map((e) => [e, snap[e]])) : { [entity]: snap[entity] };
    return file(new Uint8Array(await toXLSX(sheets)), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx");
  }
  return new Response("formato non valido", { status: 400 });
}
