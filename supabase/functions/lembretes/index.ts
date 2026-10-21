// Função agendada (a cada hora): às 9h locais de cada aparelho, avisa dos pagamentos recorrentes vencidos.
// Segredos necessários: VAPID_PRIVATE e CRON_SECRET (a chave pública abaixo é a mesma do app).
const VAPID_PUBLIC = "BAEBl2ASI_oneAy1ZXFHc9Ws8oPLI7nfJYkDk2r2ls_7XGEpUoTdyLvr27ItcMbkR2evXE33OmNaf50lglWTdoo";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const HOUR = 9;
const pad = (n: number) => String(n).padStart(2, "0");

function localParts(tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
const nextKey = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
};
function dueDate(ym: string, day: number) {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${pad(Math.min(day, new Date(y, m, 0).getDate()))}`;
}
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("forbidden", { status: 403 });
  webpush.setVapidDetails("mailto:claudeescritorio26@gmail.com", VAPID_PUBLIC, Deno.env.get("VAPID_PRIVATE")!);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: subs } = await sb.from("push_subscriptions").select("endpoint,p256dh,auth,tz,user_id");
  let sent = 0;
  const rulesCache = new Map<string, any[]>();

  for (const s of subs ?? []) {
    let now;
    try {
      now = localParts(s.tz || "America/Cuiaba");
    } catch {
      now = localParts("America/Cuiaba");
    }
    if (now.hour !== HOUR) continue;

    if (!rulesCache.has(s.user_id)) {
      const { data } = await sb.from("recurring_rules").select("description,amount_cents,day,start_ym,last_ym,active,kind").eq("user_id", s.user_id).eq("active", true);
      rulesCache.set(s.user_id, data ?? []);
    }
    const today: string[] = [];
    let late = 0;
    for (const r of rulesCache.get(s.user_id)!) {
      let k = r.last_ym ? nextKey(r.last_ym) : r.start_ym;
      if (k < r.start_ym) k = r.start_ym;
      for (let g = 0; k <= now.date.slice(0, 7) && g < 12; g++, k = nextKey(k)) {
        const due = dueDate(k, r.day);
        if (due === now.date) today.push(`${r.description} (${brl(r.amount_cents)})`);
        else if (due < now.date) late++;
      }
    }
    if (!today.length && !late) continue;
    const parts = [];
    if (today.length) parts.push(`Vence hoje: ${today.join(", ")}.`);
    if (late) parts.push(`${late} ${late === 1 ? "pendência atrasada" : "pendências atrasadas"}.`);
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: "Lastro", body: parts.join(" "), tag: "vencimentos", url: "/" }),
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { "content-type": "application/json" } });
});
