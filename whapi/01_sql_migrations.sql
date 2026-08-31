-- ============================================================
-- SCOREZELLA WHATSAPP FUNNEL — SQL MIGRATIONS
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. Add newsletter_id to wa_channels (the actual WA newsletter ID from Whapi)
ALTER TABLE wa_channels ADD COLUMN IF NOT EXISTS newsletter_id text;
ALTER TABLE wa_channels ADD COLUMN IF NOT EXISTS whapi_token text;
ALTER TABLE wa_channels ADD COLUMN IF NOT EXISTS sport text DEFAULT 'football';

-- Update sport per channel
UPDATE wa_channels SET sport = 'all'      WHERE key = 'scorezella';
UPDATE wa_channels SET sport = 'football' WHERE key = 'epl';
UPDATE wa_channels SET sport = 'football' WHERE key = 'psl';
UPDATE wa_channels SET sport = 'football' WHERE key = 'kpl';

-- Fill in newsletter_id after running: GET https://gate.whapi.cloud/newsletters
-- UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'scorezella';
-- UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'epl';
-- UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'psl';
-- UPDATE wa_channels SET newsletter_id = '120363XXXXXXXXX@newsletter' WHERE key = 'kpl';

-- ============================================================
-- 2. Track join clicks from the app (funnel analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS wa_join_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  wa_channel_key text NOT NULL,
  clicked_at   timestamptz DEFAULT now(),
  platform     text, -- 'ios' | 'android' | 'web'
  UNIQUE(profile_id, wa_channel_key)
);

-- Auto-increment subscriber_count on each new join click
CREATE OR REPLACE FUNCTION increment_wa_subscriber()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wa_channels
  SET subscriber_count = subscriber_count + 1
  WHERE key = NEW.wa_channel_key;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_wa_join_click ON wa_join_clicks;
CREATE TRIGGER on_wa_join_click
  AFTER INSERT ON wa_join_clicks
  FOR EACH ROW EXECUTE FUNCTION increment_wa_subscriber();

-- ============================================================
-- 3. Football goal alert trigger (fixture_events → edge function)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_football_goal_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_fixture record;
  v_home_team text;
  v_away_team text;
  v_league_id bigint;
BEGIN
  -- Only fire on goal events
  IF NEW.type NOT IN ('goal', 'own_goal') THEN
    RETURN NEW;
  END IF;

  -- Get fixture info
  SELECT f.league_id,
         ht.name AS home_name,
         at.name AS away_name,
         f.goals_home,
         f.goals_away
  INTO v_fixture
  FROM fixtures f
  JOIN teams ht ON ht.id = f.home_team_id
  JOIN teams at ON at.id = f.away_team_id
  WHERE f.id = NEW.fixture_id;

  -- Fire async HTTP call to edge function (non-blocking)
  PERFORM net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-goal-alert',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'sport',       'football',
      'fixture_id',  NEW.fixture_id,
      'league_id',   v_fixture.league_id,
      'team_name',   CASE WHEN NEW.team_id IS NOT NULL THEN (SELECT name FROM teams WHERE id = NEW.team_id) ELSE 'Unknown' END,
      'player_name', COALESCE(NEW.player_name, 'Unknown'),
      'minute',      NEW.minute,
      'score_home',  v_fixture.goals_home,
      'score_away',  v_fixture.goals_away,
      'home_team',   v_fixture.home_name,
      'away_team',   v_fixture.away_name,
      'event_type',  NEW.type
    )::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_football_goal ON fixture_events;
CREATE TRIGGER on_football_goal
  AFTER INSERT ON fixture_events
  FOR EACH ROW EXECUTE FUNCTION trigger_football_goal_alert();

-- ============================================================
-- 4. Cricket goal/wicket alert trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_cricket_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire on status change to live or score update
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'live')
  OR (OLD.score IS DISTINCT FROM NEW.score) THEN

    PERFORM net.http_post(
      url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-goal-alert',
      headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
      body    := json_build_object(
        'sport',      'cricket',
        'fixture_id', NEW.id,
        'league_id',  NEW.league_id,
        'home_team',  NEW.home_team,
        'away_team',  NEW.away_team,
        'score',      NEW.score,
        'status',     NEW.status,
        'event_type', CASE WHEN NEW.status = 'live' THEN 'kickoff' ELSE 'score_update' END
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_cricket_update ON cricket_fixtures;
CREATE TRIGGER on_cricket_update
  AFTER UPDATE ON cricket_fixtures
  FOR EACH ROW EXECUTE FUNCTION trigger_cricket_alert();

-- ============================================================
-- 5. Rugby try/score alert trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_rugby_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'live')
  OR (OLD.score_home IS DISTINCT FROM NEW.score_home)
  OR (OLD.score_away IS DISTINCT FROM NEW.score_away) THEN

    PERFORM net.http_post(
      url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-goal-alert',
      headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
      body    := json_build_object(
        'sport',      'rugby',
        'fixture_id', NEW.id,
        'league_id',  NEW.league_id,
        'home_team',  NEW.home_team,
        'away_team',  NEW.away_team,
        'score_home', NEW.score_home,
        'score_away', NEW.score_away,
        'status',     NEW.status,
        'event_type', CASE WHEN NEW.status = 'live' THEN 'kickoff' ELSE 'score_update' END
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_rugby_update ON rugby_fixtures;
CREATE TRIGGER on_rugby_update
  AFTER UPDATE ON rugby_fixtures
  FOR EACH ROW EXECUTE FUNCTION trigger_rugby_alert();

-- ============================================================
-- 6. Football kickoff/fulltime trigger (fixtures status change)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_football_match_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
  AND NEW.status IN ('live', 'finished') THEN

    PERFORM net.http_post(
      url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-kickoff-alert',
      headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
      body    := json_build_object(
        'sport',      'football',
        'fixture_id', NEW.id,
        'league_id',  NEW.league_id,
        'status',     NEW.status,
        'score_home', NEW.goals_home,
        'score_away', NEW.goals_away
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_football_status ON fixtures;
CREATE TRIGGER on_football_status
  AFTER UPDATE ON fixtures
  FOR EACH ROW EXECUTE FUNCTION trigger_football_match_status();

-- ============================================================
-- 7. Cron jobs for digest + standings
-- ============================================================

-- Daily digest: 8am UTC every day
SELECT cron.schedule(
  'whapi-daily-digest',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-daily-digest',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Weekly standings: every Monday 9am UTC
SELECT cron.schedule(
  'whapi-standings-update',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-standings-update',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
