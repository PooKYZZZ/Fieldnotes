CREATE TABLE "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX user_email_unique ON "user" (email);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX session_token_unique ON session (token);
CREATE INDEX session_user_id_idx ON session (user_id);

CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX account_provider_account_unique ON account (provider_id, account_id);
CREATE INDEX account_user_id_idx ON account (user_id);

CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE "rateLimit" (
  id TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL,
  count INTEGER NOT NULL,
  "lastRequest" INTEGER NOT NULL
);
CREATE UNIQUE INDEX rate_limit_key_unique ON "rateLimit" ("key");

CREATE TABLE legacy_progress (
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL,
  comfort TEXT,
  notes TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  repository_url TEXT NOT NULL DEFAULT '',
  task_observations TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (item_type, item_id)
) WITHOUT ROWID;

INSERT INTO legacy_progress (
  item_type, item_id, status, comfort, notes, evidence, repository_url, task_observations, created_at, updated_at
)
SELECT item_type, item_id, status, comfort, notes, evidence, repository_url, task_observations, created_at, updated_at
FROM learning_progress;

DROP TABLE learning_progress;

CREATE TABLE learning_progress (
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL,
  comfort TEXT,
  notes TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  repository_url TEXT NOT NULL DEFAULT '',
  task_observations TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_type, item_id)
) WITHOUT ROWID;
