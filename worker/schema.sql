-- Shared notes. The id is what shows up in the link, so it is the primary key
-- rather than a surrogate.
CREATE TABLE IF NOT EXISTS notes (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  edit_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  views      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS notes_expires ON notes (expires_at);

-- One row per browser that has linked a Telegram chat. The token is generated on
-- the device and never leaves it except to talk to this API.
CREATE TABLE IF NOT EXISTS planner_devices (
  token     TEXT PRIMARY KEY,
  chat_id   TEXT NOT NULL,
  chat_name TEXT,
  linked_at INTEGER NOT NULL
);

-- Codes are what the user actually types into Telegram, so they are short and
-- short-lived.
CREATE TABLE IF NOT EXISTS planner_codes (
  code       TEXT PRIMARY KEY,
  token      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS planner_codes_created ON planner_codes (created_at);

-- Occurrences are worked out on the device, where the Ethiopian calendar code
-- already lives, and pushed here as plain timestamps.
CREATE TABLE IF NOT EXISTS reminders (
  id        TEXT PRIMARY KEY,
  token     TEXT NOT NULL,
  -- Which part of the app queued it. A push replaces only its own source, so
  -- the focus timer cannot wipe the planner's reminders and the other way round.
  source    TEXT NOT NULL DEFAULT 'planner',
  title     TEXT NOT NULL,
  notes     TEXT NOT NULL DEFAULT '',
  -- Formatted on the device: only it knows whether the user reads Ethiopian or
  -- Gregorian dates, and in which timezone.
  when_text TEXT NOT NULL DEFAULT '',
  start_at  INTEGER NOT NULL,
  remind_at INTEGER NOT NULL,
  sent_at   INTEGER
);

CREATE INDEX IF NOT EXISTS reminders_due ON reminders (sent_at, remind_at);
CREATE INDEX IF NOT EXISTS reminders_token ON reminders (token);

-- The shared Amharic dictionary. `uses` is how many devices have reported the
-- word, which is what keeps a typo from reaching everyone.
CREATE TABLE IF NOT EXISTS words (
  word     TEXT PRIMARY KEY,
  uses     INTEGER NOT NULL DEFAULT 1,
  added_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS words_added ON words (added_at);
