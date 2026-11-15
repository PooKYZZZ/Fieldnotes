import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { createProgressDatabase } from "@/features/progress/storage/database";
import type { ProgressInput } from "@/features/progress/model";

const migrationDirectory = path.join(process.cwd(), "migrations");
const temporaryDirectories: string[] = [];
const makePath = () => {
  const directory = mkdtempSync(path.join(tmpdir(), "devops-fieldnotes-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "progress.sqlite");
};

function seedPriorDatabase(databasePath: string, migrations: string[], records: Array<ProgressInput & { createdAt: number; updatedAt: number }>) {
  const sqlite = new Database(databasePath);
  sqlite.exec("CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, applied_at INTEGER NOT NULL) WITHOUT ROWID");
  const applied = sqlite.prepare("INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)");
  for (const filename of migrations) {
    sqlite.exec(readFileSync(path.join(migrationDirectory, filename), "utf8"));
    applied.run(filename, 1);
  }
  const insert = sqlite.prepare(`
    INSERT INTO learning_progress (
      item_type, item_id, status, comfort, notes, evidence, repository_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const entry of records) {
    insert.run(entry.itemType, entry.itemId, entry.status, entry.comfort, entry.notes, entry.evidence, entry.repositoryUrl, entry.createdAt, entry.updatedAt);
  }
  sqlite.close();
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const record: ProgressInput = {
  itemType: "module",
  itemId: "M01",
  status: "completed",
  comfort: "independent",
  notes: "Reproduced the process model and explained it.",
  evidence: "Local test log saved without sensitive values.",
  repositoryUrl: "",
};

describe("local progress database", () => {
  it("adds lesson rows while preserving existing module and activity fields", () => {
    const databasePath = makePath();
    const activity: ProgressInput = { ...record, itemType: "activity", itemId: "A01", notes: "Activity notes", evidence: "Activity evidence" };
    const timestamp = Date.now() - 1000;
    seedPriorDatabase(databasePath, ["0001_create_learning_progress.sql"], [
      { ...record, createdAt: timestamp, updatedAt: timestamp },
      { ...activity, createdAt: timestamp, updatedAt: timestamp },
    ]);

    const afterMigration = createProgressDatabase(databasePath, migrationDirectory);
    expect(afterMigration.find("module", "M01")).toMatchObject(record);
    expect(afterMigration.find("activity", "A01")).toMatchObject(activity);

    const lesson: ProgressInput = { ...record, itemType: "lesson", itemId: "M01-L01", notes: "Lesson note" };
    afterMigration.save(lesson);
    expect(afterMigration.find("lesson", "M01-L01")).toMatchObject(lesson);
    expect(afterMigration.find("module", "M01")).toMatchObject({ notes: record.notes, evidence: record.evidence });
    expect(afterMigration.list()).toHaveLength(3);
    afterMigration.close();
  });

  it("applies migrations and persists updates across connections", () => {
    const databasePath = makePath();
    const first = createProgressDatabase(databasePath, migrationDirectory);
    expect(first.health()).toEqual({ status: "ok", database: "sqlite" });
    first.save(record);
    first.close();

    const reopened = createProgressDatabase(databasePath, migrationDirectory);
    expect(reopened.list()).toHaveLength(1);
    expect(reopened.find("module", "M01")).toMatchObject(record);
    const updated = reopened.save({ ...record, status: "needs_review", notes: "Revisit the VM boundary." });
    expect(updated.status).toBe("needs_review");
    expect(reopened.list()).toHaveLength(1);
    reopened.close();
  });

  it("adds task observations to an existing v2 database and preserves them when importing a v1 or v2 row", () => {
    const databasePath = makePath();
    const oldRecord: ProgressInput = {
      ...record,
      itemType: "activity",
      itemId: "A01",
      status: "completed",
      comfort: "guided",
      notes: "Legacy note remains unassigned.",
      evidence: "Legacy command evidence remains available.",
      repositoryUrl: "https://example.test/a01",
    };
    const originalTimestamp = Date.now() - 1000;
    seedPriorDatabase(databasePath, ["0001_create_learning_progress.sql", "0002_add_lesson_progress.sql"], [
      { ...oldRecord, createdAt: originalTimestamp, updatedAt: originalTimestamp },
    ]);

    const migrated = createProgressDatabase(databasePath, migrationDirectory);
    expect(migrated.find("activity", "A01")).toMatchObject({ ...oldRecord, updatedAt: originalTimestamp, taskObservations: {} });
    const withTaskNotes = migrated.save({
      ...oldRecord,
      taskObservations: { "compare-proc": "The PID matched; VmRSS differed slightly." },
    });
    expect(withTaskNotes).toMatchObject({ status: "completed", notes: oldRecord.notes, evidence: oldRecord.evidence });

    const importedLegacyRecord: ProgressInput = { ...oldRecord, status: "completed", notes: "Imported older note." };
    const imported = migrated.saveMany([importedLegacyRecord]);
    expect(imported).toHaveLength(1);
    expect(migrated.find("activity", "A01")).toMatchObject({
      status: "completed",
      notes: "Imported older note.",
      evidence: oldRecord.evidence,
      taskObservations: { "compare-proc": "The PID matched; VmRSS differed slightly." },
    });
    expect(migrated.list()).toHaveLength(1);
    migrated.close();
  });

  it("stores task-linked observations for another activity without replacing its existing record fields", () => {
    const databasePath = makePath();
    const first = createProgressDatabase(databasePath, migrationDirectory);
    const oldA02: ProgressInput = {
      ...record,
      itemType: "activity",
      itemId: "A02",
      status: "in_progress",
      notes: "Older A02 reflection stays available.",
      evidence: "Earlier directory inventory evidence.",
      repositoryUrl: "https://example.test/a02",
    };
    first.save(oldA02);
    const linked = first.save({
      ...oldA02,
      taskObservations: { "a02-predict-the-inventory": "The empty file should report zero bytes." },
    });
    expect(linked).toMatchObject({
      notes: oldA02.notes,
      evidence: oldA02.evidence,
      repositoryUrl: oldA02.repositoryUrl,
      taskObservations: { "a02-predict-the-inventory": "The empty file should report zero bytes." },
    });
    first.close();

    const reopened = createProgressDatabase(databasePath, migrationDirectory);
    expect(reopened.find("activity", "A02")).toMatchObject(linked);
    reopened.close();
  });

  it("merges a batch in one transaction while preserving unrelated saved items", () => {
    const database = createProgressDatabase(makePath(), migrationDirectory);
    database.save(record);
    const merged = database.saveMany([
      { ...record, status: "needs_review", notes: "Imported update." },
      { ...record, itemType: "activity", itemId: "A01", status: "in_progress", notes: "Started the lab." },
    ]);

    expect(merged).toHaveLength(2);
    expect(database.find("module", "M01")).toMatchObject({ status: "needs_review", notes: "Imported update." });
    expect(database.find("activity", "A01")).toMatchObject({ status: "in_progress", notes: "Started the lab." });
    expect(database.list()).toHaveLength(2);
    database.close();
  });
});

