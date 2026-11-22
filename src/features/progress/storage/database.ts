import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/features/progress/storage/schema";
import * as authSchema from "@/features/auth/storage/schema";
import type { ProgressInput, ProgressRecord, ProgressSummary } from "@/features/progress/model";
import { isValidPersistedProgressTimestamp, maxDateTimestampMs } from "@/features/progress/timestamp";

function applyMigrations(sqlite: InstanceType<typeof Database>, migrationDirectory: string): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    ) WITHOUT ROWID
  `);
  const migrations = readdirSync(migrationDirectory)
    .filter((filename) => /^\d+_[a-z0-9_]+\.sql$/.test(filename))
    .sort();
  const isApplied = sqlite.prepare("SELECT 1 FROM schema_migrations WHERE filename = ?");
  const recordApplied = sqlite.prepare("INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)");

  for (const filename of migrations) {
    if (isApplied.get(filename)) continue;
    const migration = readFileSync(path.join(migrationDirectory, filename), "utf8");
    sqlite.transaction(() => {
      sqlite.exec(migration);
      recordApplied.run(filename, Date.now());
    })();
  }
}

function fromRow(row: typeof schema.learningProgress.$inferSelect): ProgressRecord {
  const record: ProgressRecord = {
    itemType: row.itemType as ProgressInput["itemType"],
    itemId: row.itemId,
    status: row.status as ProgressInput["status"],
    comfort: row.comfort as ProgressInput["comfort"],
    notes: row.notes,
    evidence: row.evidence,
    repositoryUrl: row.repositoryUrl,
    updatedAt: row.updatedAt,
    revision: row.revision,
  };
  if (row.itemType === "activity" || row.itemType === "project" || row.itemType === "small_project") {
    const taskObservations: unknown = JSON.parse(row.taskObservations);
    if (typeof taskObservations !== "object" || taskObservations === null || Array.isArray(taskObservations)
      || !Object.values(taskObservations).every((value) => typeof value === "string")) {
      throw new Error(`The saved ${row.itemType} ${row.itemId} task observations are invalid.`);
    }
    record.taskObservations = taskObservations as Record<string, string>;
  }
  return record;
}

export function createProgressDatabase(databasePath: string, migrationDirectory: string) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  try {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("foreign_keys = ON");
    applyMigrations(sqlite, migrationDirectory);
  } catch (error) {
    sqlite.close();
    throw error;
  }
  const orm = drizzle(sqlite, { schema: { ...schema, ...authSchema } });

  function upsert(userId: string, input: ProgressInput, createdAt: number, importedUpdatedAt?: number): ProgressRecord {
    const existing = findForUser(userId, input.itemType, input.itemId);
    const previousUpdatedAt = existing?.updatedAt;
    const nextTimestamp = previousUpdatedAt === undefined || !isValidPersistedProgressTimestamp(previousUpdatedAt, createdAt)
      ? createdAt
      : previousUpdatedAt < maxDateTimestampMs
        ? Math.max(createdAt, previousUpdatedAt + 1)
        : createdAt;
    const updatedAt = importedUpdatedAt ?? (isValidPersistedProgressTimestamp(nextTimestamp, createdAt) ? nextTimestamp : createdAt);
    const taskObservationsJson = JSON.stringify(input.taskObservations ?? {});
    const savedRow = orm.insert(schema.learningProgress)
      .values({ ...input, userId, taskObservations: taskObservationsJson, createdAt, updatedAt })
      .onConflictDoUpdate({
        target: [schema.learningProgress.userId, schema.learningProgress.itemType, schema.learningProgress.itemId],
        set: {
          status: input.status,
          comfort: input.comfort,
          notes: input.notes,
          evidence: input.evidence,
          repositoryUrl: input.repositoryUrl,
          ...(input.taskObservations !== undefined ? { taskObservations: taskObservationsJson } : {}),
          updatedAt,
          revision: sql`${schema.learningProgress.revision} + 1`,
        },
      })
      .returning()
      .get();
    if (!savedRow) throw new Error("The saved progress record could not be read back.");
    return fromRow(savedRow);
  }

  function findForUser(userId: string, itemType: ProgressInput["itemType"], itemId: string): ProgressRecord | undefined {
    const row = orm.select().from(schema.learningProgress)
      .where(and(
        eq(schema.learningProgress.userId, userId),
        eq(schema.learningProgress.itemType, itemType),
        eq(schema.learningProgress.itemId, itemId),
      ))
      .get();
    return row ? fromRow(row) : undefined;
  }

  return {
    orm,
    list(userId: string): ProgressRecord[] {
      return orm.select().from(schema.learningProgress)
        .where(eq(schema.learningProgress.userId, userId))
        .all().map(fromRow);
    },
    listSummary(userId: string): ProgressSummary[] {
      const rows = orm.select({
        itemType: schema.learningProgress.itemType,
        itemId: schema.learningProgress.itemId,
        status: schema.learningProgress.status,
        updatedAt: schema.learningProgress.updatedAt,
        revision: schema.learningProgress.revision,
        hasContent: sql<number>`CASE WHEN
          length(trim(${schema.learningProgress.notes})) > 0
          OR length(trim(${schema.learningProgress.evidence})) > 0
          OR length(trim(${schema.learningProgress.repositoryUrl})) > 0
          OR EXISTS (
            SELECT 1 FROM json_each(${schema.learningProgress.taskObservations}) AS observation
            WHERE length(trim(CAST(observation.value AS TEXT))) > 0
          )
          THEN 1 ELSE 0 END`,
      }).from(schema.learningProgress)
        .where(eq(schema.learningProgress.userId, userId))
        .all();
      return rows.map((row) => ({
        ...row,
        itemType: row.itemType as ProgressInput["itemType"],
        status: row.status as ProgressInput["status"],
        revision: row.revision,
        hasContent: row.hasContent === 1,
      }));
    },
    findVerifiedUserIdByEmail(email: string): string | undefined {
      const row = sqlite.prepare('SELECT id FROM "user" WHERE lower(email) = lower(?) AND email_verified = 1 LIMIT 1')
        .get(email) as { id: string } | undefined;
      return row?.id;
    },
    find(userId: string, itemType: ProgressInput["itemType"], itemId: string): ProgressRecord | undefined {
      return findForUser(userId, itemType, itemId);
    },
    save(userId: string, input: ProgressInput): ProgressRecord {
      return upsert(userId, input, Date.now());
    },
    saveIfCurrent(userId: string, input: ProgressInput, expectedRevision: number | null): { record: ProgressRecord } | { conflict: ProgressRecord | undefined } {
      const saveWhenCurrent = sqlite.transaction(() => {
        const current = findForUser(userId, input.itemType, input.itemId);
        if ((current?.revision ?? null) !== expectedRevision) return { conflict: current } as const;
        return { record: upsert(userId, input, Date.now()) } as const;
      });
      return saveWhenCurrent();
    },
    saveMany(userId: string, inputs: ProgressInput[]): ProgressRecord[] {
      const now = Date.now();
      const saveTransaction = sqlite.transaction(() => inputs.map((input) => upsert(userId, input, now)));
      return saveTransaction();
    },
    mergeMany(userId: string, inputs: Array<ProgressInput & { updatedAt: number }>): { records: ProgressRecord[]; preservedCount: number } {
      const mergeTransaction = sqlite.transaction(() => {
        const records: ProgressRecord[] = [];
        let preservedCount = 0;
        for (const input of inputs) {
          const current = findForUser(userId, input.itemType, input.itemId);
          if (current && current.updatedAt >= input.updatedAt) {
            preservedCount += 1;
            continue;
          }
          records.push(upsert(userId, input, input.updatedAt, input.updatedAt));
        }
        return { records, preservedCount };
      });
      return mergeTransaction();
    },
    claimLegacyProgress(userId: string): number {
      const claim = sqlite.transaction(() => {
        const claimed = sqlite.prepare("SELECT 1 FROM owner_progress_claims WHERE user_id = ?").get(userId);
        if (claimed) return 0;
        const verifiedUser = sqlite.prepare('SELECT 1 FROM "user" WHERE id = ? AND email_verified = 1').get(userId);
        if (!verifiedUser) return 0;
        sqlite.prepare('UPDATE "user" SET role = ? WHERE id = ? AND role <> ?').run("admin", userId, "admin");
        const legacyRows = sqlite.prepare("SELECT * FROM legacy_progress ORDER BY item_type, item_id")
          .all() as Array<{
            item_type: ProgressInput["itemType"];
            item_id: string;
            status: ProgressInput["status"];
            comfort: ProgressInput["comfort"];
            notes: string;
            evidence: string;
            repository_url: string;
            task_observations: string;
            created_at: number;
            updated_at: number;
          }>;

        for (const row of legacyRows) {
          const input: ProgressInput = {
            itemType: row.item_type,
            itemId: row.item_id,
            status: row.status,
            comfort: row.comfort,
            notes: row.notes,
            evidence: row.evidence,
            repositoryUrl: row.repository_url,
            ...((row.item_type === "activity" || row.item_type === "project" || row.item_type === "small_project")
              ? { taskObservations: JSON.parse(row.task_observations) as Record<string, string> }
              : {}),
          };
          const existing = findForUser(userId, row.item_type, row.item_id);
          if (!existing || row.updated_at > existing.updatedAt) {
            upsert(userId, input, row.created_at, row.updated_at);
          }
        }

        sqlite.prepare("DELETE FROM legacy_progress").run();
        sqlite.prepare("INSERT INTO owner_progress_claims (user_id, claimed_at) VALUES (?, ?)").run(userId, Date.now());
        return legacyRows.length;
      });
      return claim();
    },
    health(): { status: string; database: string } {
      const row = sqlite.prepare("SELECT 1 AS ok").get() as { ok: number };
      return { status: row.ok === 1 ? "ok" : "error", database: "sqlite" };
    },
    close(): void { sqlite.close(); },
  };
}

