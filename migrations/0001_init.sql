CREATE TABLE uploads (
  id TEXT PRIMARY KEY,
  guest_name TEXT,
  table_number INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'video')),
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  thumb_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready')) DEFAULT 'pending',
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_uploads_gallery ON uploads (status, hidden, created_at DESC, id DESC);
CREATE INDEX idx_uploads_created_at ON uploads (created_at);
