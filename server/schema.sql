PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  category_zh TEXT NOT NULL,
  category_en TEXT NOT NULL,
  level INTEGER NOT NULL,
  tier INTEGER NOT NULL,
  tier_name_zh TEXT NOT NULL,
  xp INTEGER NOT NULL,
  cadence_zh TEXT NOT NULL,
  stats_json TEXT NOT NULL,
  source TEXT NOT NULL,
  custom_json TEXT
);

CREATE TABLE IF NOT EXISTS quest_state (
  challenge_id TEXT PRIMARY KEY REFERENCES challenges(id) ON DELETE CASCADE,
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1))
);

CREATE TABLE IF NOT EXISTS completions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  completed_at TEXT NOT NULL,
  reward_json TEXT
);

CREATE INDEX IF NOT EXISTS completions_challenge_id_idx ON completions(challenge_id);
CREATE INDEX IF NOT EXISTS completions_completed_at_idx ON completions(completed_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  language TEXT NOT NULL DEFAULT 'zh' CHECK (language IN ('zh', 'en')),
  font TEXT NOT NULL DEFAULT 'noto' CHECK (font IN ('noto', 'zcool', 'pixel', 'system')),
  custom_features INTEGER NOT NULL DEFAULT 1 CHECK (custom_features IN (0, 1)),
  hide_personal_content INTEGER NOT NULL DEFAULT 1 CHECK (hide_personal_content IN (0, 1)),
  collection_features INTEGER NOT NULL DEFAULT 1 CHECK (collection_features IN (0, 1))
);

INSERT INTO settings (id, language, font) VALUES (1, 'zh', 'noto')
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
