// supabase/functions/whapi-goal-alert/index.ts
// Handles goal/wicket/try alerts for football, cricket, rugby
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
  return res.ok;
}

function buildFootballMessage(payload: any): string {
  const { team_name, player_name, minute, score_home, score_away, home_team, away_team, event_type } = payload;
  const isOwnGoal = event_type === "own_goal";
  return (
    `⚽ *${isOwnGoal ? "OWN GOAL!" : "GOAL!"}*\n\n` +
    `*${team_name}* score!\n` +
    `👤 ${player_name}${minute ? ` — ${minute}'` : ""}\n` +
    `📊 *${home_team} ${score_home ?? 0} - ${score_away ?? 0} ${away_team}*\n\n` +
    `🏆 Live on ScoreZella`
  );
}

function buildCricketMessage(payload: any): string {
  const { home_team, away_team, score, status, event_type } = payload;
  if (event_type === "kickoff") {
    return (
      `🏏 *MATCH STARTED!*\n\n` +
      `*${home_team}* vs *${away_team}*\n\n` +
      `Follow live on ScoreZella`
    );
  }
  return (
    `🏏 *SCORE UPDATE*\n\n` +
    `*${home_team}* vs *${away_team}*\n` +
    `📊 ${score ?? "—"}\n\n` +
    `Follow live on ScoreZella`
  );
}

function buildRugbyMessage(payload: any): string {
  const { home_team, away_team, score_home, score_away, event_type } = payload;
  if (event_type === "kickoff") {
    return (
      `🏉 *KICKOFF!*\n\n` +
      `*${home_team}* vs *${away_team}*\n\n` +
      `Follow live on ScoreZella`
    );
  }
  return (
    `🏉 *SCORE UPDATE*\n\n` +
    `*${home_team}* ${score_home ?? 0} - ${score_away ?? 0} *${away_team}*\n\n` +
    `Follow live on ScoreZella`
  );
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { sport, league_id, event_type } = payload;

    // Build message based on sport
    let message = "";
    if (sport === "football") message = buildFootballMessage(payload);
    else if (sport === "cricket") message = buildCricketMessage(payload);
    else if (sport === "rugby") message = buildRugbyMessage(payload);
    else return new Response("unknown sport", { status: 400 });

    // Get channels to notify:
    // 1. The league-specific channel
    // 2. Always the "scorezella" all-sports channel
    const channelFilter =
      sport === "football"
        ? `league_id.eq.${league_id},key.eq.scorezella`
        : sport === "cricket"
        ? `key.in.(scorezella)`  // extend when cricket channels added
        : `key.in.(scorezella)`; // extend when rugby channels added

    const { data: channels } = await supabase
      .from("wa_channels")
      .select("key, newsletter_id, label")
      .or(
        league_id
          ? `league_id.eq.${league_id},key.eq.scorezella`
          : `key.eq.scorezella`
      );

    if (!channels || channels.length === 0) {
      console.log("No channels found for league_id:", league_id);
      return new Response("no channels", { status: 200 });
    }

    // Deduplicate by newsletter_id and send
    const sent = new Set<string>();
    for (const ch of channels) {
      if (!ch.newsletter_id || sent.has(ch.newsletter_id)) continue;
      sent.add(ch.newsletter_id);
      const ok = await sendToChannel(ch.newsletter_id, message);
      console.log(`Sent to ${ch.label} (${ch.key}): ${ok}`);
    }

    return new Response(JSON.stringify({ sent: sent.size }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
