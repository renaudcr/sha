// supabase/functions/whapi-daily-digest/index.ts
// Runs every day at 8am UTC — sends top news + today's fixtures to all channels
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHAPI_TOKEN = Deno.env.get("WHAPI_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHAPI_BASE = "https://gate.whapi.cloud";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendToChannel(newsletterId: string, message: string) {
  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: newsletterId, body: message }),
  });
  if (!res.ok) console.error("Whapi error:", await res.text());
  return res.ok;
}

function todayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

Deno.serve(async (_req) => {
  try {
    const { start, end } = todayRange();

    // ── FOOTBALL ──────────────────────────────────────────────
    const { data: footballNews } = await supabase
      .from("news")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: footballFixtures } = await supabase
      .from("fixtures")
      .select(`
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name),
        date,
        league:leagues(name)
      `)
      .gte("date", start)
      .lte("date", end)
      .limit(5);

    const footballNewsLines = footballNews?.map((n, i) => `${i + 1}. ${n.title}`).join("\n") ?? "No news today";
    const footballFixtureLines = footballFixtures?.map((f: any) =>
      `• ${f.home_team?.name} vs ${f.away_team?.name}${f.league?.name ? ` (${f.league.name})` : ""}`
    ).join("\n") ?? "No fixtures today";

    const footballMsg =
      `☀️ *Good Morning from ScoreZella!*\n\n` +
      `⚽ *Top Football Stories*\n${footballNewsLines}\n\n` +
      `📅 *Today's Matches*\n${footballFixtureLines}\n\n` +
      `Open ScoreZella for live scores 🏆`;

    // ── CRICKET ──────────────────────────────────────────────
    const { data: cricketNews } = await supabase
      .from("cricket_news")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: cricketFixtures } = await supabase
      .from("cricket_fixtures")
      .select("home_team, away_team, date, league:cricket_leagues(name)")
      .gte("date", start)
      .lte("date", end)
      .limit(5);

    const cricketNewsLines = cricketNews?.map((n, i) => `${i + 1}. ${n.title}`).join("\n") ?? "No news today";
    const cricketFixtureLines = cricketFixtures?.map((f: any) =>
      `• ${f.home_team} vs ${f.away_team}${f.league?.name ? ` (${f.league.name})` : ""}`
    ).join("\n") ?? "No fixtures today";

    const cricketMsg =
      `☀️ *Good Morning from ScoreZella!*\n\n` +
      `🏏 *Top Cricket Stories*\n${cricketNewsLines}\n\n` +
      `📅 *Today's Matches*\n${cricketFixtureLines}\n\n` +
      `Open ScoreZella for live scores 🏆`;

    // ── RUGBY ──────────────────────────────────────────────
    const { data: rugbyNews } = await supabase
      .from("rugby_news")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: rugbyFixtures } = await supabase
      .from("rugby_fixtures")
      .select("home_team, away_team, date, league:rugby_leagues(name)")
      .gte("date", start)
      .lte("date", end)
      .limit(5);

    const rugbyNewsLines = rugbyNews?.map((n, i) => `${i + 1}. ${n.title}`).join("\n") ?? "No news today";
    const rugbyFixtureLines = rugbyFixtures?.map((f: any) =>
      `• ${f.home_team} vs ${f.away_team}${f.league?.name ? ` (${f.league.name})` : ""}`
    ).join("\n") ?? "No fixtures today";

    const rugbyMsg =
      `☀️ *Good Morning from ScoreZella!*\n\n` +
      `🏉 *Top Rugby Stories*\n${rugbyNewsLines}\n\n` +
      `📅 *Today's Matches*\n${rugbyFixtureLines}\n\n` +
      `Open ScoreZella for live scores 🏆`;

    // ── COMBINED ALL-SPORTS MESSAGE ──────────────────────────
    const allSportsMsg =
      `☀️ *Good Morning from ScoreZella!*\n\n` +
      `⚽ *Football*\n${footballNewsLines}\n\n` +
      `🏏 *Cricket*\n${cricketNewsLines}\n\n` +
      `🏉 *Rugby*\n${rugbyNewsLines}\n\n` +
      `📅 *Today: ${(footballFixtures?.length ?? 0) + (cricketFixtures?.length ?? 0) + (rugbyFixtures?.length ?? 0)} matches across all sports*\n\n` +
      `Open ScoreZella for live scores 🏆`;

    // ── SEND TO CHANNELS ─────────────────────────────────────
    // Get all channels with their newsletter IDs and sport
    const { data: channels } = await supabase
      .from("wa_channels")
      .select("key, newsletter_id, label, sport, league_id")
      .not("newsletter_id", "is", null);

    const results: Record<string, boolean> = {};

    for (const ch of channels ?? []) {
      if (!ch.newsletter_id) continue;

      let msg = "";
      if (ch.sport === "all") msg = allSportsMsg;
      else if (ch.sport === "football") msg = footballMsg;
      else if (ch.sport === "cricket") msg = cricketMsg;
      else if (ch.sport === "rugby") msg = rugbyMsg;
      else msg = allSportsMsg;

      const ok = await sendToChannel(ch.newsletter_id, msg);
      results[ch.key] = ok;
      console.log(`Daily digest → ${ch.label}: ${ok}`);

      // Small delay between sends to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    }

    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
