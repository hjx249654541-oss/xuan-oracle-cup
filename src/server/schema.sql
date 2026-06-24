CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  local_time TEXT NOT NULL,
  group_name TEXT NOT NULL,
  phase TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS match_results (
  match_id TEXT PRIMARY KEY REFERENCES matches(id),
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  status TEXT NOT NULL,
  minute TEXT,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  provider TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  market_type TEXT NOT NULL,
  raw_snapshot_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL REFERENCES matches(id),
  home TEXT NOT NULL,
  draw TEXT NOT NULL,
  away TEXT NOT NULL,
  total_line TEXT NOT NULL,
  over_price TEXT NOT NULL,
  under_price TEXT NOT NULL,
  provider TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  raw_snapshot_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_usage (
  visitor_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  market_views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (visitor_id, usage_date)
);

CREATE TABLE IF NOT EXISTS entitlements (
  visitor_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
