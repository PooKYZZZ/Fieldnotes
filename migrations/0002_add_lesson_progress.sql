CREATE TABLE learning_progress_with_lessons (
  item_type TEXT NOT NULL CHECK (item_type IN ('module', 'lesson', 'activity', 'troubleshooting', 'small_project', 'project', 'milestone')),
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

INSERT INTO learning_progress_with_lessons (
  item_type, item_id, status, comfort, notes, evidence, repository_url, created_at, updated_at
)
SELECT
  item_type, item_id, status, comfort, notes, evidence, repository_url, created_at, updated_at
FROM learning_progress;

DROP TABLE learning_progress;
ALTER TABLE learning_progress_with_lessons RENAME TO learning_progress;

CREATE INDEX learning_progress_updated_at_idx
  ON learning_progress(updated_at DESC);