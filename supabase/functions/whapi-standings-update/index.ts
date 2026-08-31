// supabase/functions/whapi-standings-update/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHAPI_TOKEN = Deno.env.get("WHAPI_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHAPI_BASE = "https://gate.whapi.cloud";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const MEDALS = ["🥇", "🥈", "🥉", "4.", "5."];

async function sendToChannel(newsletterId: string, message: string) {
  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHAPI_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: newsletterId, body: message }),
  });
  if (!res.ok) console.error("Whapi error:", await res.text());
  return res.ok;
}

Deno.serve(async (_req) => {
  try {
    const { data: channels } = await supabase
      .from("wa_channels")
      .select("key, newsletter_id, label, sport, league_id")
      .not("newsletter_id", "is", null);

    const results: Record<string, boolean> = {};

    for (const ch of channels ?? []) {
      if (!ch.newsletter_id) continue;
      let message = "";

      if (ch.sport === "all") {
        // Football top 3 — use goal_difference column (confirmed)
        const { data: fTop } = await supabase
          .from("standings")
          .select("team:teams(name), points, played, won, draw, lost, goal_difference, form")
          .order("points", { ascending: false })
          .order("goal_difference", { ascending: false })
          .limit(3);

        // Cricket top 3 — uses team_id (join teams), neto_run_rate, won, lost, points
        const { data: cTop } = await supabase
          .from("cricket_standings")
          .select("team:cricket_teams(name), points, played, won, lost, neto_run_rate")
          .order("points", { ascending: false })
          .order("neto_run_rate", { ascending: false })
          .limit(3);

        // Rugby top 3 — uses league_points, bonus_points, tries_for
        const { data: rTop } = await supabase
          .from("rugby_standings")
          .select("team:rugby_teams(name), league_points, played, won, drawn, lost, bonus_points")
          .order("league_points", { ascending: false })
          .limit(3);

        const fLines = fTop?.map((s: any, i) =>
          `${MEDALS[i]} ${s.team?.name} — ${s.points}pts  GD${s.goal_difference >= 0 ? "+" : ""}${s.goal_difference}${s.form ? `  Form: ${s.form}` : ""}`
        ).join("\n") ?? "—";

        const cLines = cTop?.map((s: any, i) =>
          `${MEDALS[i]} ${s.team?.name} — ${s.points}pts  W${s.won}/L${s.lost}  NRR:${Number(s.neto_run_rate ?? 0).toFixed(3)}`
        ).join("\n") ?? "—";

        const rLines = rTop?.map((s: any, i) =>
          `${MEDALS[i]} ${s.team?.name} — ${s.league_points}pts  W${s.won}/L${s.lost}  Bonus:${s.bonus_points ?? 0}`
        ).join("\n") ?? "—";

        message =
          `📊 *Weekly Standings Update*\n\n` +
          `⚽ *Football Top 3*\n${fLines}\n\n` +
          `🏏 *Cricket Top 3*\n${cLines}\n\n` +
          `🏉 *Rugby Top 3*\n${rLines}\n\n` +
          `Full tables on ScoreZella 📱`;

      } else if (ch.sport === "football" && ch.league_id) {
        const { data: rows } = await supabase
          .from("standings")
          .select("team:teams(name), points, played, won, draw, lost, goals_for, goals_against, goal_difference, form, league:leagues(name)")
          .eq("league_id", ch.league_id)
          .order("points", { ascending: false })
          .order("goal_difference", { ascending: false })
          .limit(5);

        if (!rows?.length) continue;
        const leagueName = (rows[0] as any)?.league?.name ?? ch.label;
        const lines = rows.map((s: any, i) =>
          `${MEDALS[i]} *${s.team?.name}*  ${s.points}pts  GD${s.goal_difference >= 0 ? "+" : ""}${s.goal_difference}  ${s.form ?? ""}`
        ).join("\n");

        message = `📊 *${leagueName} Table*\n\n${lines}\n\nFull table on ScoreZella 📱`;

      } else if (ch.sport === "cricket" && ch.league_id) {
        const { data: rows } = await supabase
          .from("cricket_standings")
          .select("team:cricket_teams(name), points, played, won, lost, draw, no_result, neto_run_rate, league:cricket_leagues(name)")
          .eq("league_id", ch.league_id)
          .order("points", { ascending: false })
          .order("neto_run_rate", { ascending: false })
          .limit(5);

        if (!rows?.length) continue;
        const leagueName = (rows[0] as any)?.league?.name ?? ch.label;
        const lines = rows.map((s: any, i) =>
          `${MEDALS[i]} *${s.team?.name}*  ${s.points}pts  W${s.won}/L${s.lost}  NRR:${Number(s.neto_run_rate ?? 0).toFixed(3)}`
        ).join("\n");

        message = `📊 *${leagueName} Table*\n\n${lines}\n\nFull table on ScoreZella 📱`;

      } else if (ch.sport === "rugby" && ch.league_id) {
        const { data: rows } = await supabase
          .from("rugby_standings")
          .select("team:rugby_teams(name), league_points, played, won, drawn, lost, bonus_points, points_for, points_against, point_difference, league:rugby_leagues(name)")
          .eq("league_id", ch.league_id)
          .order("league_points", { ascending: false })
          .limit(5);

        if (!rows?.length) continue;
        const leagueName = (rows[0] as any)?.league?.name ?? ch.label;
        const lines = rows.map((s: any, i) =>
          `${MEDALS[i]} *${s.team?.name}*  ${s.league_points}pts  W${s.won}/L${s.lost}  PD${s.point_difference >= 0 ? "+" : ""}${s.point_difference}`
        ).join("\n");

        message = `📊 *${leagueName} Table*\n\n${lines}\n\nFull table on ScoreZella 📱`;
      }

      if (!message) continue;
      const ok = await sendToChannel(ch.newsletter_id, message);
      results[ch.key] = ok;
      console.log(`Standings → ${ch.label}: ${ok}`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
