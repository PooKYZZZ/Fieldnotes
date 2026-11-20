import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/features/progress/storage/schema";
import * as authSchema from "@/features/auth/storage/schema";
import type { ProgressInput, ProgressRecord } from "@/features/progress/model";

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
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  applyMigrations(sqlite, migrationDirectory);
  const orm = drizzle(sqlite, { schema: { ...schema, ...authSchema } });

  function upsert(userId: string, input: ProgressInput, createdAt: number, updatedAt = createdAt): ProgressRecord {
    const isActivity = input.itemType === "activity";
    const existingTaskObservations = isActivity && input.taskObservations === undefined
      ? orm.select({ taskObservations: schema.learningProgress.taskObservations })
        .from(schema.learningProgress)
        .where(and(
          eq(schema.learningProgress.userId, userId),
          eq(schema.learningProgress.itemType, input.itemType),
          eq(schema.learningProgress.itemId, input.itemId),
        ))
        .get()?.taskObservations
      : undefined;
    const taskObservations = input.taskObservations
      ?? (existingTaskObservations ? JSON.parse(existingTaskObservations) as Record<string, string> : {});
    const taskObservationsJson = JSON.stringify(taskObservations);
    orm.insert(schema.learningProgress)
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
        },
      })
      .run();
    return { ...input, ...(isActivity || input.itemType === "project" || input.itemType === "small_project" ? { taskObservations } : {}), updatedAt };
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
    find(userId: string, itemType: ProgressInput["itemType"], itemId: string): ProgressRecord | undefined {
      return findForUser(userId, itemType, itemId);
    },
    save(userId: string, input: ProgressInput): ProgressRecord {
      return upsert(userId, input, Date.now());
    },
    saveMany(userId: string, inputs: ProgressInput[]): ProgressRecord[] {
      const now = Date.now();
      const saveTransaction = sqlite.transaction(() => inputs.map((input) => upsert(userId, input, now)));
      return saveTransaction();
    },
    ensureOwnerRole(userId: string): void {
      sqlite.prepare('UPDATE "user" SET role = ? WHERE id = ?').run("admin", userId);
    },
    claimLegacyProgress(userId: string): number {
      const claim = sqlite.transaction(() => {
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

