import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/features/progress/storage/schema";
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
  if (row.itemType === "activity" && row.itemId === "A01") {
    const taskObservations: unknown = JSON.parse(row.taskObservations);
    if (typeof taskObservations !== "object" || taskObservations === null || Array.isArray(taskObservations)
      || !Object.values(taskObservations).every((value) => typeof value === "string")) {
      throw new Error("The saved A01 task observations are invalid.");
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
  const orm = drizzle(sqlite, { schema });

  function upsert(input: ProgressInput, now: number): ProgressRecord {
    const isA01 = input.itemType === "activity" && input.itemId === "A01";
    const existingTaskObservations = isA01 && input.taskObservations === undefined
      ? orm.select({ taskObservations: schema.learningProgress.taskObservations })
        .from(schema.learningProgress)
        .where(and(eq(schema.learningProgress.itemType, input.itemType), eq(schema.learningProgress.itemId, input.itemId)))
        .get()?.taskObservations
      : undefined;
    const taskObservations = input.taskObservations
      ?? (existingTaskObservations ? JSON.parse(existingTaskObservations) as Record<string, string> : {});
    const taskObservationsJson = JSON.stringify(taskObservations);
    orm.insert(schema.learningProgress)
      .values({ ...input, taskObservations: taskObservationsJson, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [schema.learningProgress.itemType, schema.learningProgress.itemId],
        set: {
          status: input.status,
          comfort: input.comfort,
          notes: input.notes,
          evidence: input.evidence,
          repositoryUrl: input.repositoryUrl,
          ...(input.taskObservations !== undefined ? { taskObservations: taskObservationsJson } : {}),
          updatedAt: now,
        },
      })
      .run();
    return { ...input, ...(isA01 ? { taskObservations } : {}), updatedAt: now };
  }

  return {
    list(): ProgressRecord[] {
      return orm.select().from(schema.learningProgress).all().map(fromRow);
    },
    find(itemType: ProgressInput["itemType"], itemId: string): ProgressRecord | undefined {
      const row = orm.select().from(schema.learningProgress)
        .where(and(eq(schema.learningProgress.itemType, itemType), eq(schema.learningProgress.itemId, itemId)))
        .get();
      return row ? fromRow(row) : undefined;
    },
    save(input: ProgressInput): ProgressRecord {
      return upsert(input, Date.now());
    },
    saveMany(inputs: ProgressInput[]): ProgressRecord[] {
      const now = Date.now();
      const saveTransaction = sqlite.transaction(() => inputs.map((input) => upsert(input, now)));
      return saveTransaction();
    },
    health(): { status: string; database: string } {
      const row = sqlite.prepare("SELECT 1 AS ok").get() as { ok: number };
      return { status: row.ok === 1 ? "ok" : "error", database: "sqlite" };
    },
    close(): void { sqlite.close(); },
  };
}

