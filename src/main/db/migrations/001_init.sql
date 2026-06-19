CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

CREATE TABLE ads (
  id              TEXT PRIMARY KEY,
  logical_ad_id   TEXT NOT NULL,
  platform        TEXT NOT NULL,
  platform_ad_id  TEXT,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  price_cents     INTEGER,
  currency        TEXT NOT NULL DEFAULT 'CAD',
  category        TEXT,
  status          TEXT NOT NULL,
  url             TEXT,
  views           INTEGER,
  posted_at       INTEGER NOT NULL,
  last_renewed_at INTEGER,
  last_scraped_at INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_ads_platform_status ON ads(platform, status);
CREATE INDEX idx_ads_logical ON ads(logical_ad_id);
CREATE INDEX idx_ads_posted ON ads(posted_at);
CREATE UNIQUE INDEX idx_ads_platform_pid ON ads(platform, platform_ad_id) WHERE platform_ad_id IS NOT NULL;

CREATE TABLE ad_photos (
  id            TEXT PRIMARY KEY,
  ad_id         TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  photo_hash    TEXT NOT NULL,
  order_index   INTEGER NOT NULL,
  original_url  TEXT,
  UNIQUE(ad_id, order_index)
);
CREATE INDEX idx_photos_hash ON ad_photos(photo_hash);

CREATE TABLE ad_drafts (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  price_cents   INTEGER,
  currency      TEXT NOT NULL DEFAULT 'CAD',
  per_platform  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE draft_photos (
  id            TEXT PRIMARY KEY,
  draft_id      TEXT NOT NULL REFERENCES ad_drafts(id) ON DELETE CASCADE,
  photo_hash    TEXT NOT NULL,
  order_index   INTEGER NOT NULL,
  UNIQUE(draft_id, order_index)
);

CREATE TABLE repost_history (
  id              TEXT PRIMARY KEY,
  logical_ad_id   TEXT NOT NULL,
  platform        TEXT NOT NULL,
  action          TEXT NOT NULL,
  success         INTEGER NOT NULL,
  error_code      TEXT,
  error_message   TEXT,
  before_ad_id    TEXT,
  after_ad_id     TEXT,
  timestamp       INTEGER NOT NULL
);
CREATE INDEX idx_history_logical ON repost_history(logical_ad_id, timestamp DESC);
CREATE INDEX idx_history_platform_ts ON repost_history(platform, timestamp DESC);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('age_threshold_days.facebook', '7'),
  ('age_threshold_days.kijiji', '25'),
  ('scan_cron', '"0 9 * * *"'),
  ('daily_action_cap.facebook', '20'),
  ('daily_action_cap.kijiji', '30'),
  ('repost_strategy.facebook', '"delete_and_recreate"'),
  ('repost_strategy.kijiji', '"renew_first"'),
  ('per_ad_cooldown_hours', '12'),
  ('tos_acknowledged', 'false'),
  ('scans_paused', 'false'),
  ('notify.aging', 'true'),
  ('notify.errors', 'true'),
  ('notify.captcha', 'true'),
  ('notify.scan_complete', 'false');

INSERT INTO schema_version (version) VALUES (1);
