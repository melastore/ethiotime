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

-- An account is a 16-digit number and nothing else: no email, no password, no
-- way back if it is lost. Only its hash is stored, so a copy of this table is
-- not a list of working credentials.
CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL,
  -- Counts up once per push. It is what "everything since I last looked" means,
  -- because no clock on any device is involved in it.
  seq        INTEGER NOT NULL DEFAULT 0
);

-- Everything an account syncs, whatever tool it came from. The app's own shapes
-- stay inside payload, so a new tool needs a bucket name and no new table. A
-- null payload is a tombstone: the record was deleted at updated_at.
CREATE TABLE IF NOT EXISTS items (
  account    TEXT NOT NULL,
  bucket     TEXT NOT NULL,
  id         TEXT NOT NULL,
  payload    TEXT,
  -- The device's clock, which decides who wins when two devices changed the
  -- same record.
  updated_at INTEGER NOT NULL,
  -- The account's counter, which decides what a device has not seen yet. Two
  -- stamps because the devices disagree about the time and the server does not.
  seq        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account, bucket, id)
);

CREATE INDEX IF NOT EXISTS items_seq ON items (account, seq);

-- Past versions of a note. Thinned by age on write rather than swept on a
-- timer, so the cost is paid by whoever is making the versions.
CREATE TABLE IF NOT EXISTS versions (
  account  TEXT NOT NULL,
  id       TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  payload  TEXT NOT NULL,
  PRIMARY KEY (account, id, saved_at)
);
