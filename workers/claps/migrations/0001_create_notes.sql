CREATE TABLE notes (
  id TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 120),
  nickname TEXT NOT NULL DEFAULT '路过的人' CHECK (length(nickname) BETWEEN 1 AND 24),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  author_hash TEXT NOT NULL CHECK (length(author_hash) = 64),
  content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  review_note TEXT CHECK (review_note IS NULL OR length(review_note) <= 120)
) WITHOUT ROWID;

CREATE INDEX notes_status_created_idx
  ON notes (status, created_at DESC, id DESC);

CREATE INDEX notes_author_created_idx
  ON notes (author_hash, created_at DESC);
