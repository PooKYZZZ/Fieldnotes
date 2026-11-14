CREATE TABLE IF NOT EXISTS learning_progress (
  item_type TEXT NOT NULL CHECK (item_type IN ('module', 'activity', 'troubleshooting', 'small_project', 'project', 'milestone')),
  item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'needs_review', 'completed')),
  comfort TEXT CHECK (comfort IS NULL OR comfort IN ('familiar', 'guided', 'independent')),
  notes TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  repository_url TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (item_type, item_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS learning_progress_updated_at_idx
  ON learning_progress(updated_at DESC);
