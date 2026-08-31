-- ============================================================
-- SCOREZELLA WHATSAPP FUNNEL — NEW TRIGGERS & CRONS
-- Run this in Supabase SQL Editor AFTER 01_sql_migrations.sql
-- ============================================================

-- ============================================================
-- 1. Breaking news trigger — football news
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_football_news_alert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-news-alert',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'sport',   'football',
      'title',   NEW.title,
      'content', NEW.content,
      'url',     NEW.url
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_football_news ON news;
CREATE TRIGGER on_football_news
  AFTER INSERT ON news
  FOR EACH ROW EXECUTE FUNCTION trigger_football_news_alert();

-- ============================================================
-- 2. Breaking news trigger — cricket news
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_cricket_news_alert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-news-alert',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'sport',   'cricket',
      'title',   NEW.title,
      'content', NEW.content,
      'url',     NEW.url
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_cricket_news ON cricket_news;
CREATE TRIGGER on_cricket_news
  AFTER INSERT ON cricket_news
  FOR EACH ROW EXECUTE FUNCTION trigger_cricket_news_alert();

-- ============================================================
-- 3. Breaking news trigger — rugby news
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_rugby_news_alert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-news-alert',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'sport',   'rugby',
      'title',   NEW.title,
      'content', NEW.content,
      'url',     NEW.url
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_rugby_news ON rugby_news;
CREATE TRIGGER on_rugby_news
  AFTER INSERT ON rugby_news
  FOR EACH ROW EXECUTE FUNCTION trigger_rugby_news_alert();

-- ============================================================
-- 4. Transfer alert trigger — player_transfers
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_transfer_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_player_name text;
  v_from_team   text;
  v_to_team     text;
BEGIN
  -- Get player name
  SELECT name INTO v_player_name FROM players WHERE id = NEW.player_id;
  -- Get team names if team IDs stored
  SELECT name INTO v_from_team FROM teams WHERE id = NEW.from_team_id;
  SELECT name INTO v_to_team   FROM teams WHERE id = NEW.to_team_id;

  PERFORM net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-transfer-alert',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'player_id',     NEW.player_id,
      'player_name',   COALESCE(v_player_name, 'Unknown Player'),
      'from_team',     COALESCE(v_from_team, NEW.from_team_name, 'Unknown'),
      'to_team',       COALESCE(v_to_team, NEW.to_team_name, 'Unknown'),
      'fee',           NEW.fee,
      'transfer_type', NEW.type,
      'date',          NEW.date
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_player_transfer ON player_transfers;
CREATE TRIGGER on_player_transfer
  AFTER INSERT ON player_transfers
  FOR EACH ROW EXECUTE FUNCTION trigger_transfer_alert();

-- ============================================================
-- 5. Cron: pre-match reminder every 15 mins
-- ============================================================
SELECT cron.schedule(
  'whapi-prematch-reminder',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://hazklaujrysleqxnmezk.supabase.co/functions/v1/whapi-prematch-reminder',
    headers := '{"Authorization":"Bearer sb_publishable_HCP3Pi7_DvQpIei4MnRQ4Q_aTXGyCbT","Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
