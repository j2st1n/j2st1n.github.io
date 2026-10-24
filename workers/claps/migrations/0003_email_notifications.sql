CREATE TABLE notification_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT
) WITHOUT ROWID;

CREATE INDEX notification_due_idx
  ON notification_outbox (next_attempt_at, created_at)
  WHERE sent_at IS NULL;

CREATE TABLE clap_notification_counts (
  day TEXT NOT NULL,
  slug TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0),
  PRIMARY KEY (day, slug)
) WITHOUT ROWID;
