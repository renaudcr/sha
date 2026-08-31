// supabase/functions/whapi-news-alert/index.ts
// Triggered by DB trigger when new row inserted into news / cricket_news / rugby_news
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

Deno.serve(async (req) => {
  try {
    // Payload from DB trigger: { sport, title, content, url, image_url, league_id? }
    const payload = await req.json();
    const { sport, title, content, url, league_id } = payload;

    if (!title) return new Response("no title", { status: 400 });

    const sportIcon = sport === "football" ? "⚽" : sport === "cricket" ? "🏏" : sport === "rugby" ? "🏉" : "🔔";

    // Truncate content to 200 chars for preview
    const preview = content
      ? content.replace(/\n/g, " ").slice(0, 200) + (content.length > 200 ? "..." : "")
      : "";

    const message =
      `${sportIcon} *BREAKING NEWS*\n\n` +
      `*${title}*\n\n` +
      (preview ? `${preview}\n\n` : "") +
      `Read more on ScoreZella 📱`;

    // Get channels: league-specific + all-sports
    const { data: channels } = await supabase
      .from("wa_channels")
      .select("key, newsletter_id, label, sport")
      .or(
        league_id
          ? `league_id.eq.${league_id},key.eq.scorezella,sport.eq.${sport}`
          : `key.eq.scorezella,sport.eq.${sport}`
      )
      .not("newsletter_id", "is", null);

    const sent = new Set<string>();
    for (const ch of channels ?? []) {
      if (!ch.newsletter_id || sent.has(ch.newsletter_id)) continue;
      sent.add(ch.newsletter_id);
      await sendToChannel(ch.newsletter_id, message);
      console.log(`News alert → ${ch.label}`);
      await new Promise((r) => setTimeout(r, 800));
    }

    return new Response(JSON.stringify({ sent: sent.size }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
