// supabase/functions/whapi-prematch-reminder/index.ts
// Runs every 15min via cron — sends reminder for matches starting in ~60 mins
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHAPI_TOKEN = Deno.env.get("WHAPI_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHAPI_BASE = "https://gate.whapi.cloud";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendToChannel(newsletterId: string, message: string) {
  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHAPI_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: newsletterId, body: message }),
  });
  if (!res.ok) console.error("Whapi error:", await res.text());
  return res.ok;
}

// Returns ISO strings for window: now+50min to now+70min (catches the ~60min mark)
function kickoffWindow() {
  const now = Date.now();
  return {
    from: new Date(now + 50 * 60 * 1000).toISOString(),
    to:   new Date(now + 70 * 60 * 1000).toISOString(),
  };
}

Deno.serve(async (_req) => {
  try {
    const { from, to } = kickoffWindow();
    const results: string[] = [];

    // ── FOOTBALL ──────────────────────────────────────────────────────
    const { data: footballMatches } = await supabase
      .from("fixtures")
      .select(`
        id, date, league_id,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name),
        league:leagues(name),
        venue:venues(name)
      `)
      .gte("date", from)
      .lte("date", to)
      .eq("status", "scheduled");

    for (const match of footballMatches ?? []) {
      const m = match as any;
      const kickoffTime = new Date(m.date).toUTCString().slice(17, 22) + " UTC";
      const message =
        `⏰ *STARTING SOON — 60 mins!*\n\n` +
        `⚽ *${m.home_team?.name} vs ${m.away_team?.name}*\n` +
        `🏆 ${m.league?.name ?? ""}\n` +
        (m.venue?.name ? `📍 ${m.venue.name}\n` : "") +
        `🕐 Kickoff: ${kickoffTime}\n\n` +
        `Watch live on ScoreZella 📱`;

      // Send to league channel + all-sports
      const { data: channels } = await supabase
        .from("wa_channels")
        .select("newsletter_id, label")
        .or(`league_id.eq.${m.league_id},key.eq.scorezella`)
        .not("newsletter_id", "is", null);

      const sent = new Set<string>();
      for (const ch of channels ?? []) {
        if (!ch.newsletter_id || sent.has(ch.newsletter_id)) continue;
        sent.add(ch.newsletter_id);
        await sendToChannel(ch.newsletter_id, message);
        results.push(`football:${m.home_team?.name} vs ${m.away_team?.name} → ${ch.label}`);
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // ── CRICKET ──────────────────────────────────────────────────────
    const { data: cricketMatches } = await supabase
      .from("cricket_fixtures")
      .select("id, date, league_id, home_team, away_team, league:cricket_leagues(name)")
      .gte("date", from)
      .lte("date", to)
      .eq("status", "scheduled");

    for (const match of cricketMatches ?? []) {
      const m = match as any;
      const kickoffTime = new Date(m.date).toUTCString().slice(17, 22) + " UTC";
      const message =
        `⏰ *STARTING SOON — 60 mins!*\n\n` +
        `🏏 *${m.home_team} vs ${m.away_team}*\n` +
        `🏆 ${m.league?.name ?? ""}\n` +
        `🕐 Start: ${kickoffTime}\n\n` +
        `Follow live on ScoreZella 📱`;

      const { data: channels } = await supabase
        .from("wa_channels")
        .select("newsletter_id, label")
        .or(`league_id.eq.${m.league_id},key.eq.scorezella,sport.eq.cricket`)
        .not("newsletter_id", "is", null);

      const sent = new Set<string>();
      for (const ch of channels ?? []) {
        if (!ch.newsletter_id || sent.has(ch.newsletter_id)) continue;
        sent.add(ch.newsletter_id);
        await sendToChannel(ch.newsletter_id, message);
        results.push(`cricket:${m.home_team} vs ${m.away_team} → ${ch.label}`);
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // ── RUGBY ──────────────────────────────────────────────────────
    const { data: rugbyMatches } = await supabase
      .from("rugby_fixtures")
      .select("id, date, league_id, home_team, away_team, league:rugby_leagues(name)")
      .gte("date", from)
      .lte("date", to)
      .eq("status", "scheduled");

    for (const match of rugbyMatches ?? []) {
      const m = match as any;
      const kickoffTime = new Date(m.date).toUTCString().slice(17, 22) + " UTC";
      const message =
        `⏰ *STARTING SOON — 60 mins!*\n\n` +
        `🏉 *${m.home_team} vs ${m.away_team}*\n` +
        `🏆 ${m.league?.name ?? ""}\n` +
        `🕐 Kickoff: ${kickoffTime}\n\n` +
        `Follow live on ScoreZella 📱`;

      const { data: channels } = await supabase
        .from("wa_channels")
        .select("newsletter_id, label")
        .or(`league_id.eq.${m.league_id},key.eq.scorezella,sport.eq.rugby`)
        .not("newsletter_id", "is", null);

      const sent = new Set<string>();
      for (const ch of channels ?? []) {
        if (!ch.newsletter_id || sent.has(ch.newsletter_id)) continue;
        sent.add(ch.newsletter_id);
        await sendToChannel(ch.newsletter_id, message);
        results.push(`rugby:${m.home_team} vs ${m.away_team} → ${ch.label}`);
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    return new Response(JSON.stringify({ sent: results }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
