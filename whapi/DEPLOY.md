# ScoreZella WhatsApp Funnel — Deployment Guide

## What Was Built

| File | Purpose |
|---|---|
| `01_sql_migrations.sql` | Tables, triggers, cron jobs |
| `functions/whapi-goal-alert/` | ⚽🏏🏉 Live score alerts |
| `functions/whapi-kickoff-alert/` | Match start + full time alerts |
| `functions/whapi-daily-digest/` | 8am daily news + fixtures |
| `functions/whapi-standings-update/` | Monday weekly table |

---

## Step 1 — Get Your Newsletter IDs from Whapi

Run this in your terminal or Postman:

```bash
curl https://gate.whapi.cloud/newsletters \
  -H "Authorization: Bearer YOUR_WHAPI_TOKEN"
```

You'll get a list like:
```json
[
  { "id": "120363XXXXXXXXX@newsletter", "name": "ScoreZella All Sports" },
  { "id": "120363XXXXXXXXX@newsletter", "name": "Premier League" }
]
```

Then update your DB:
```sql
UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'scorezella';
UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'epl';
UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'psl';
UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'kpl';
```

---

## Step 2 — Run SQL Migrations

Go to Supabase → SQL Editor → paste and run `01_sql_migrations.sql`

This creates:
- `wa_join_clicks` table (tracks app join button clicks)
- Auto-increment trigger on `wa_channels.subscriber_count`
- DB triggers on `fixture_events`, `fixtures`, `cricket_fixtures`, `rugby_fixtures`
- Cron jobs for daily digest (8am) and weekly standings (Monday 9am)

---

## Step 3 — Set Supabase Secrets

In Supabase dashboard → Edge Functions → Secrets, add:

```
WHAPI_TOKEN = your_whapi_bearer_token_here
```

(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase)

---

## Step 4 — Deploy Edge Functions

Install Supabase CLI if not already:
```bash
npm install -g supabase
supabase login
supabase link --project-ref hazklaujrysleqxnmezk
```

Deploy all 4 functions:
```bash
supabase functions deploy whapi-goal-alert     --project-ref hazklaujrysleqxnmezk
supabase functions deploy whapi-kickoff-alert  --project-ref hazklaujrysleqxnmezk
supabase functions deploy whapi-daily-digest   --project-ref hazklaujrysleqxnmezk
supabase functions deploy whapi-standings-update --project-ref hazklaujrysleqxnmezk
```

---

## Step 5 — Test Each Function Manually

```bash
# Test goal alert (football)
curl -X POST https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-goal-alert \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sport": "football",
    "league_id": 8,
    "team_name": "Arsenal",
    "player_name": "Saka",
    "minute": "67",
    "score_home": 1,
    "score_away": 0,
    "home_team": "Arsenal",
    "away_team": "Man City",
    "event_type": "goal"
  }'

# Test daily digest
curl -X POST https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-daily-digest \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test standings
curl -X POST https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-standings-update \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Step 6 — App Side (Join Button Logic)

When a user clicks "Join WhatsApp Channel" in your app, call:

```typescript
// In your app — record the click + open WhatsApp
async function handleJoinChannel(channelKey: string, channelUrl: string) {
  // 1. Record in DB for analytics
  await supabase.from('wa_join_clicks').upsert({
    profile_id: currentUser.id,
    wa_channel_key: channelKey,
    platform: 'web' // or 'ios' / 'android'
  }, { onConflict: 'profile_id,wa_channel_key' });

  // 2. Open WhatsApp channel
  window.open(channelUrl, '_blank');
}

// Which channels to show — based on user's fav_leagues in profile
async function getRelevantChannels(profile) {
  const { data: channels } = await supabase
    .from('wa_channels')
    .select('*')
    .order('sort_order');

  // Filter: show league channel if user follows that league
  return channels.filter(ch =>
    ch.league_id === null || // all-sports always shown
    profile.fav_leagues?.includes(ch.league_id) ||
    profile.fav_cricket_leagues?.includes(ch.league_id) ||
    profile.fav_rugby_leagues?.includes(ch.league_id)
  );
}
```

---

## Full Automation Flow (Once Live)

```
Every minute (ingest-live runs)
    → fixture_events row inserted (goal)
    → DB trigger fires trigger_football_goal_alert()
    → whapi-goal-alert edge function called
    → Whapi sends message to EPL channel + ScoreZella channel
    → 62,400 subscribers get the goal alert instantly

Every 8am UTC
    → cron fires whapi-daily-digest
    → Pulls latest news + fixtures for all 3 sports
    → Sends tailored message to each channel by sport

Every Monday 9am UTC
    → cron fires whapi-standings-update
    → Sends top 5 table per league to each channel

When user clicks Join in app
    → wa_join_clicks row inserted
    → subscriber_count auto-increments
    → User opens WhatsApp and joins channel
```

---

## Next Ideas to Grow Further

| Idea | Impact |
|---|---|
| Add cricket/rugby league channels (like EPL) | More targeted, higher open rate |
| Transfer alert function (watches player_transfers table) | High viral potential |
| Pre-match reminder 1hr before kickoff | Drives app opens |
| Poll after each match ("MOTM?") via Whapi interactive | Engagement boost |
| Weekly "Top Scorer" update | Fantasy sports fans love this |
