// supabase/functions/whapi-transfer-alert/index.ts
// Triggered by DB trigger on INSERT to player_transfers
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
    // Payload from DB trigger on player_transfers INSERT
    const payload = await req.json();
    const { player_id, player_name, from_team, to_team, fee, transfer_type, date } = payload;

    if (!player_name) return new Response("no player", { status: 400 });

    const feeStr = fee
      ? `💰 Fee: ${fee}`
      : transfer_type === "loan"
      ? `📋 Loan deal`
      : transfer_type === "free"
      ? `🆓 Free transfer`
      : "";

    const message =
      `🔄 *TRANSFER NEWS*\n\n` +
      `*${player_name}*\n` +
      `${from_team ?? "Unknown"} ➡️ ${to_team ?? "Unknown"}\n` +
      (feeStr ? `${feeStr}\n` : "") +
      (date ? `📅 ${new Date(date).toDateString()}\n` : "") +
      `\nMore transfers on ScoreZella 📱`;

    // Transfer news goes to all-sports + football channel (transfers are football-only for now)
    const { data: channels } = await supabase
      .from("wa_channels")
      .select("newsletter_id, label")
      .or(`key.eq.scorezella,sport.eq.football`)
      .not("newsletter_id", "is", null);

    const sent = new Set<string>();
    for (const ch of channels ?? []) {
      if (!ch.newsletter_id || sent.has(ch.newsletter_id)) continue;
      sent.add(ch.newsletter_id);
      await sendToChannel(ch.newsletter_id, message);
      console.log(`Transfer alert → ${ch.label}`);
      await new Promise((r) => setTimeout(r, 800));
    }

    return new Response(JSON.stringify({ sent: sent.size }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
