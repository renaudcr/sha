// supabase/functions/whapi-kickoff-alert/index.ts
// Fires when a match starts (live) or ends (finished) for all 3 sports
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

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { sport, fixture_id, league_id, status, score_home, score_away } = payload;

    // Fetch team names
    let home_team = "", away_team = "", league_name = "", venue = "";

    if (sport === "football") {
      const { data: fixture } = await supabase
        .from("fixtures")
        .select(`
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name),
          league:leagues(name),
          venue:venues(name)
        `)
        .eq("id", fixture_id)
        .single();

      home_team   = fixture?.home_team?.name ?? "";
      away_team   = fixture?.away_team?.name ?? "";
      league_name = fixture?.league?.name ?? "";
      venue       = fixture?.venue?.name ?? "";
    } else if (sport === "cricket") {
      const { data: fixture } = await supabase
        .from("cricket_fixtures")
        .select("home_team, away_team, league:cricket_leagues(name)")
        .eq("id", fixture_id)
        .single();
      home_team   = fixture?.home_team ?? "";
      away_team   = fixture?.away_team ?? "";
      league_name = fixture?.league?.name ?? "";
    } else if (sport === "rugby") {
      const { data: fixture } = await supabase
        .from("rugby_fixtures")
        .select("home_team, away_team, league:rugby_leagues(name)")
        .eq("id", fixture_id)
        .single();
      home_team   = fixture?.home_team ?? "";
      away_team   = fixture?.away_team ?? "";
      league_name = fixture?.league?.name ?? "";
    }

    // Build message
    const sportIcon = sport === "football" ? "⚽" : sport === "cricket" ? "🏏" : "🏉";
    let message = "";

    if (status === "live") {
      message =
        `${sportIcon} *KICKOFF!*\n\n` +
        `*${home_team}* vs *${away_team}*\n` +
        (league_name ? `🏆 ${league_name}\n` : "") +
        (venue ? `📍 ${venue}\n` : "") +
        `\nFollow live on ScoreZella 📱`;
    } else if (status === "finished") {
      message =
        `${sportIcon} *FULL TIME!*\n\n` +
        `*${home_team}* ${score_home ?? 0} — ${score_away ?? 0} *${away_team}*\n` +
        (league_name ? `🏆 ${league_name}\n` : "") +
        `\nFull stats on ScoreZella 📱`;
    } else {
      return new Response("not a kickoff/fulltime event", { status: 200 });
    }

    // Get channels: league-specific + all-sports
    const { data: channels } = await supabase
      .from("wa_channels")
      .select("key, newsletter_id, label")
      .or(league_id ? `league_id.eq.${league_id},key.eq.scorezella` : `key.eq.scorezella`);

    const sent = new Set<string>();
    for (const ch of channels ?? []) {
      if (!ch.newsletter_id || sent.has(ch.newsletter_id)) continue;
      sent.add(ch.newsletter_id);
      await sendToChannel(ch.newsletter_id, message);
      console.log(`Sent ${status} alert to ${ch.label}`);
    }

    return new Response(JSON.stringify({ sent: sent.size }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
