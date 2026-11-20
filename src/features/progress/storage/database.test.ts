import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { createProgressDatabase } from "@/features/progress/storage/database";
import { authUser } from "@/features/auth/storage/schema";
import type { ProgressInput } from "@/features/progress/model";

const migrationDirectory = path.join(process.cwd(), "migrations");
const temporaryDirectories: string[] = [];
const ownerId = "learner-owner";
const anotherLearnerId = "learner-other";
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

function addUser(database: ReturnType<typeof createProgressDatabase>, id: string, email = `${id}@example.test`) {
  const now = new Date();
  database.orm.insert(authUser).values({
    id,
    name: id,
    email,
    emailVerified: true,
    image: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
  }).run();
}

function createDatabase(databasePath = makePath()) {
  const database = createProgressDatabase(databasePath, migrationDirectory);
  addUser(database, ownerId);
  return database;
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

describe("account-scoped progress database", () => {
  it("deletes an owner's saved progress and archived legacy records with the account", () => {
    const databasePath = makePath();
    const legacyRecord = { ...record, createdAt: Date.now() - 1000, updatedAt: Date.now() - 1000 };
    seedPriorDatabase(databasePath, ["0001_create_learning_progress.sql"], [legacyRecord]);

    const database = createProgressDatabase(databasePath, migrationDirectory);
    const now = new Date();
    database.orm.insert(authUser).values({
      id: ownerId,
      name: ownerId,
      email: "owner@example.test",
      emailVerified: true,
      image: null,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }).run();
    database.save(ownerId, record);
    database.orm.delete(authUser).where(eq(authUser.id, ownerId)).run();

    const inspector = new Database(databasePath);
    expect(inspector.prepare("SELECT COUNT(*) AS count FROM learning_progress").get()).toEqual({ count: 0 });
    expect(inspector.prepare("SELECT COUNT(*) AS count FROM legacy_progress").get()).toEqual({ count: 0 });
    inspector.close();
    database.close();
  });

  it("does not remove unclaimed legacy records when an ordinary learner account is deleted", () => {
    const databasePath = makePath();
    const legacyRecord = { ...record, createdAt: Date.now() - 1000, updatedAt: Date.now() - 1000 };
    seedPriorDatabase(databasePath, ["0001_create_learning_progress.sql"], [legacyRecord]);

    const database = createProgressDatabase(databasePath, migrationDirectory);
    addUser(database, anotherLearnerId);
    database.save(anotherLearnerId, record);
    database.orm.delete(authUser).where(eq(authUser.id, anotherLearnerId)).run();

    const inspector = new Database(databasePath);
    expect(inspector.prepare("SELECT COUNT(*) AS count FROM learning_progress").get()).toEqual({ count: 0 });
    expect(inspector.prepare("SELECT COUNT(*) AS count FROM legacy_progress").get()).toEqual({ count: 1 });
    inspector.close();
    database.close();
  });

  it("adds lesson rows while preserving existing fields after a legacy owner claims them", () => {
    const databasePath = makePath();
    const activity: ProgressInput = { ...record, itemType: "activity", itemId: "A01", notes: "Activity notes", evidence: "Activity evidence" };
    const timestamp = Date.now() - 1000;
    seedPriorDatabase(databasePath, ["0001_create_learning_progress.sql"], [
      { ...record, createdAt: timestamp, updatedAt: timestamp },
      { ...activity, createdAt: timestamp, updatedAt: timestamp },
    ]);

    const database = createProgressDatabase(databasePath, migrationDirectory);
    addUser(database, ownerId);
    expect(database.list(ownerId)).toEqual([]);
    expect(database.claimLegacyProgress(ownerId)).toBe(2);
    expect(database.find(ownerId, "module", "M01")).toMatchObject(record);
    expect(database.find(ownerId, "activity", "A01")).toMatchObject(activity);

    const lesson: ProgressInput = { ...record, itemType: "lesson", itemId: "M01-L01", notes: "Lesson note" };
    database.save(ownerId, lesson);
    expect(database.find(ownerId, "lesson", "M01-L01")).toMatchObject(lesson);
    expect(database.find(ownerId, "module", "M01")).toMatchObject({ notes: record.notes, evidence: record.evidence });
    expect(database.list(ownerId)).toHaveLength(3);
    expect(database.claimLegacyProgress(ownerId)).toBe(0);
    database.close();
  });

  it("applies migrations and persists updates across connections", () => {
    const databasePath = makePath();
    const first = createProgressDatabase(databasePath, migrationDirectory);
    addUser(first, ownerId);
    expect(first.health()).toEqual({ status: "ok", database: "sqlite" });
    first.save(ownerId, record);
    first.close();

    const reopened = createProgressDatabase(databasePath, migrationDirectory);
    expect(reopened.list(ownerId)).toHaveLength(1);
    expect(reopened.find(ownerId, "module", "M01")).toMatchObject(record);
    const updated = reopened.save(ownerId, { ...record, status: "needs_review", notes: "Revisit the VM boundary." });
    expect(updated.status).toBe("needs_review");
    expect(reopened.list(ownerId)).toHaveLength(1);
    reopened.close();
  });

  it("copies v2 records into an unclaimed archive and preserves A01 observations during owner adoption", () => {
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
    seedPriorDatabase(databasePath, ["0001_create_learning_progress.sql", "0002_add_lesson_progress.sql", "0003_add_a01_task_observations.sql"], [
      { ...oldRecord, createdAt: originalTimestamp, updatedAt: originalTimestamp },
    ]);

    const migrated = createProgressDatabase(databasePath, migrationDirectory);
    addUser(migrated, ownerId);
    expect(migrated.find(ownerId, "activity", "A01")).toBeUndefined();
    expect(migrated.claimLegacyProgress(ownerId)).toBe(1);
    expect(migrated.find(ownerId, "activity", "A01")).toMatchObject({ ...oldRecord, updatedAt: originalTimestamp, taskObservations: {} });

    const withTaskNotes = migrated.save(ownerId, {
      ...oldRecord,
      taskObservations: { "compare-proc": "The PID matched; VmRSS differed slightly." },
    });
    expect(withTaskNotes).toMatchObject({ status: "completed", notes: oldRecord.notes, evidence: oldRecord.evidence });

    const importedLegacyRecord: ProgressInput = { ...oldRecord, status: "completed", notes: "Imported older note." };
    const imported = migrated.saveMany(ownerId, [importedLegacyRecord]);
    expect(imported).toHaveLength(1);
    expect(migrated.find(ownerId, "activity", "A01")).toMatchObject({
      status: "completed",
      notes: "Imported older note.",
      evidence: oldRecord.evidence,
      taskObservations: { "compare-proc": "The PID matched; VmRSS differed slightly." },
    });
    expect(migrated.list(ownerId)).toHaveLength(1);
    migrated.close();
  });

  it("keeps each learner's records separate even when item IDs match", () => {
    const database = createDatabase();
    addUser(database, anotherLearnerId);
    database.save(ownerId, { ...record, notes: "Owner-only notebook entry." });
    database.save(anotherLearnerId, { ...record, notes: "Second learner's private entry." });

    expect(database.find(ownerId, "module", "M01")?.notes).toBe("Owner-only notebook entry.");
    expect(database.find(anotherLearnerId, "module", "M01")?.notes).toBe("Second learner's private entry.");
    expect(database.list(ownerId)).toHaveLength(1);
    expect(database.list(anotherLearnerId)).toHaveLength(1);
    database.close();
  });

  it("stores task-linked activity observations without replacing existing record fields", () => {
    const database = createDatabase();
    const oldA02: ProgressInput = {
      ...record,
      itemType: "activity",
      itemId: "A02",
      status: "in_progress",
      notes: "Older A02 reflection stays available.",
      evidence: "Earlier directory inventory evidence.",
      repositoryUrl: "https://example.test/a02",
    };
    database.save(ownerId, oldA02);
    const linked = database.save(ownerId, {
      ...oldA02,
      taskObservations: { "a02-predict-the-inventory": "The empty file should report zero bytes." },
    });
    expect(linked).toMatchObject({
      notes: oldA02.notes,
      evidence: oldA02.evidence,
      repositoryUrl: oldA02.repositoryUrl,
      taskObservations: { "a02-predict-the-inventory": "The empty file should report zero bytes." },
    });
    database.close();
  });

  it("stores checkpoint observations with the shared project record", () => {
    const database = createDatabase();
    const project: ProgressInput = {
      ...record,
      itemType: "project",
      itemId: "P3",
      status: "in_progress",
      notes: "Existing project-wide design decision.",
      evidence: "Existing end-to-end verification summary.",
    };
    database.save(ownerId, project);
    const updated = database.save(ownerId, {
      ...project,
      taskObservations: { C1: "Defined the release contract and measurable acceptance check." },
    });
    expect(updated).toMatchObject({
      notes: project.notes,
      evidence: project.evidence,
      taskObservations: { C1: "Defined the release contract and measurable acceptance check." },
    });
    expect(database.list(ownerId)).toHaveLength(1);
    database.close();
  });

  it("merges a batch in one transaction while preserving unrelated saved items", () => {
    const database = createDatabase();
    database.save(ownerId, record);
    const merged = database.saveMany(ownerId, [
      { ...record, status: "needs_review", notes: "Imported update." },
      { ...record, itemType: "activity", itemId: "A01", status: "in_progress", notes: "Started the lab." },
    ]);

    expect(merged).toHaveLength(2);
    expect(database.find(ownerId, "module", "M01")).toMatchObject({ status: "needs_review", notes: "Imported update." });
    expect(database.find(ownerId, "activity", "A01")).toMatchObject({ status: "in_progress", notes: "Started the lab." });
    expect(database.list(ownerId)).toHaveLength(2);
    database.close();
  });
});
