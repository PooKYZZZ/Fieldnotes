import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { createProgressDatabase } from "@/features/progress/storage/database";
import { authUser } from "@/features/auth/storage/schema";
import type { ProgressInput } from "@/features/progress/model";
import { modules } from "@/content";
import { progressImportSchema } from "@/features/progress/validation";
import { maxBackupBytes } from "@/features/progress/backup-limits";
import { maxPersistedProgressFutureHeadroomMs, maxProgressClockSkewMs } from "@/features/progress/timestamp";

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
  vi.useRealTimers();
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

  it("rejects stale editor revisions without replacing the current record", () => {
    const database = createDatabase();
    const original = database.save(ownerId, record);
    const updated = database.saveIfCurrent(ownerId, { ...record, status: "needs_review", notes: "The current tab's note." }, original.revision);
    expect("record" in updated && updated.record.revision).toBe(original.revision + 1);

    const stale = database.saveIfCurrent(ownerId, { ...record, status: "completed", notes: "A stale tab's note." }, original.revision);
    expect(stale).toMatchObject({ conflict: { revision: original.revision + 1, notes: "The current tab's note." } });
    expect(database.find(ownerId, "module", "M01")?.notes).toBe("The current tab's note.");
    database.close();
  });

  it("keeps newer saved records when restoring older backup rows", () => {
    const database = createDatabase();
    const current = database.save(ownerId, record);
    const staleMerge = database.mergeMany(ownerId, [{ ...record, notes: "Older backup note.", updatedAt: current.updatedAt }]);
    expect(staleMerge).toMatchObject({ records: [], preservedCount: 1 });
    expect(database.find(ownerId, "module", "M01")?.notes).toBe(record.notes);

    const newerTimestamp = current.updatedAt + 1000;
    const newerMerge = database.mergeMany(ownerId, [{ ...record, notes: "Newer backup note.", updatedAt: newerTimestamp }]);
    expect(newerMerge).toMatchObject({ preservedCount: 0, records: [{ notes: "Newer backup note.", updatedAt: newerTimestamp }] });
    expect(database.find(ownerId, "module", "M01")?.notes).toBe("Newer backup note.");
    database.close();
  });

  it("keeps a local edit newer than a reimport from a clock-ahead installation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T00:00:00.000Z"));
    const database = createDatabase();
    const backup = { ...record, notes: "Imported note", updatedAt: Date.now() + 120_000 };
    const [restored] = database.mergeMany(ownerId, [backup]).records;
    const edited = database.saveIfCurrent(ownerId, { ...record, notes: "Later local edit" }, restored.revision);

    if (!("record" in edited)) throw new Error("The current revision should have been saved.");
    expect(edited).toMatchObject({ record: { updatedAt: backup.updatedAt + 1, notes: "Later local edit" } });
    const revisionAfterEdit = edited.record.revision;
    expect(database.mergeMany(ownerId, [backup])).toEqual({ records: [], preservedCount: 1 });
    expect(database.find(ownerId, record.itemType, record.itemId)).toMatchObject({ notes: "Later local edit", revision: revisionAfterEdit });
    database.close();
  });

  it("advances a save at the exact future cutoff and accepts it on the next clock tick", () => {
    vi.useFakeTimers();
    const now = new Date("2026-11-21T00:00:00.000Z").getTime();
    vi.setSystemTime(now);
    const database = createDatabase();
    const cutoffRecord = { ...record, notes: "At the future cutoff", updatedAt: now + maxProgressClockSkewMs };
    const [restored] = database.mergeMany(ownerId, [cutoffRecord]).records;
    const edited = database.saveIfCurrent(ownerId, { ...record, notes: "Edited at the future cutoff" }, restored.revision);
    if (!("record" in edited)) throw new Error("The current revision should have been saved.");
    expect(edited.record.updatedAt).toBe(cutoffRecord.updatedAt + 1);

    const secondEdit = database.saveIfCurrent(ownerId, { ...record, notes: "Second edit in the same clock millisecond" }, edited.record.revision);
    if (!("record" in secondEdit)) throw new Error("The second current revision should have been saved.");
    expect(secondEdit.record.updatedAt).toBe(cutoffRecord.updatedAt + 2);

    vi.setSystemTime(now + 2);
    const exportPayload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      records: [{ ...record, notes: secondEdit.record.notes, updatedAt: secondEdit.record.updatedAt }],
    };
    expect(progressImportSchema.safeParse(exportPayload).success).toBe(true);
    const receiver = createDatabase();
    expect(receiver.mergeMany(ownerId, progressImportSchema.parse(exportPayload).records)).toMatchObject({ preservedCount: 0 });
    expect(receiver.find(ownerId, record.itemType, record.itemId)?.notes).toBe("Second edit in the same clock millisecond");
    receiver.close();
    database.close();
  });

  it("keeps saved timestamps within the fixed persisted headroom", () => {
    vi.useFakeTimers();
    const now = new Date("2026-11-21T00:00:00.000Z").getTime();
    vi.setSystemTime(now);
    const database = createDatabase();
    const farFutureRecord = { ...record, updatedAt: now + maxProgressClockSkewMs + maxPersistedProgressFutureHeadroomMs - 1 };
    const [saved] = database.mergeMany(ownerId, [farFutureRecord]).records;
    const edited = database.saveIfCurrent(ownerId, { ...record, notes: "Keep the existing future ordering." }, saved.revision);
    if (!("record" in edited)) throw new Error("The current revision should have been saved.");
    expect(edited.record.updatedAt).toBe(now + maxProgressClockSkewMs + maxPersistedProgressFutureHeadroomMs);
    expect(progressImportSchema.safeParse({
      version: 3,
      exportedAt: new Date(now).toISOString(),
      records: [{ ...record, updatedAt: farFutureRecord.updatedAt }],
    }).success).toBe(false);
    database.close();
  });

  it("repairs a legacy timestamp beyond the persisted headroom so its export can be restored", () => {
    vi.useFakeTimers();
    const now = new Date("2026-11-21T00:00:00.000Z").getTime();
    vi.setSystemTime(now);
    const databasePath = makePath();
    const database = createDatabase(databasePath);
    const saved = database.save(ownerId, record);
    const legacyTimestamp = new Date("2035-11-21T00:00:00.000Z").getTime();
    const inspector = new Database(databasePath);
    inspector.prepare("UPDATE learning_progress SET updated_at = ? WHERE user_id = ? AND item_type = ? AND item_id = ?")
      .run(legacyTimestamp, ownerId, record.itemType, record.itemId);
    inspector.close();

    const repaired = database.saveIfCurrent(ownerId, { ...record, notes: "Repair the far-future legacy date." }, saved.revision);
    expect(repaired).toMatchObject({ record: { updatedAt: now, notes: "Repair the far-future legacy date." } });
    if (!("record" in repaired)) throw new Error("The current revision should have been saved.");
    const backup = {
      version: 3,
      exportedAt: new Date(now).toISOString(),
      records: [{ ...record, notes: repaired.record.notes, updatedAt: repaired.record.updatedAt }],
    };
    expect(progressImportSchema.safeParse(backup).success).toBe(true);
    const receiver = createDatabase();
    expect(receiver.mergeMany(ownerId, progressImportSchema.parse(backup).records).records).toHaveLength(1);
    expect(receiver.find(ownerId, record.itemType, record.itemId)?.notes).toBe("Repair the far-future legacy date.");
    receiver.close();
    database.close();
  });

  it("recovers a saved row with an invalid timestamp on its next revision-checked edit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T00:00:00.000Z"));
    const databasePath = makePath();
    const database = createDatabase(databasePath);
    const saved = database.save(ownerId, record);
    const inspector = new Database(databasePath);
    inspector.prepare("UPDATE learning_progress SET updated_at = ? WHERE user_id = ? AND item_type = ? AND item_id = ?")
      .run(8.64e15 + 1, ownerId, record.itemType, record.itemId);
    inspector.close();

    const recovered = database.saveIfCurrent(ownerId, { ...record, notes: "Recovered without losing the earlier record." }, saved.revision);
    expect(recovered).toMatchObject({ record: {
      notes: "Recovered without losing the earlier record.",
      updatedAt: Date.now(),
      revision: saved.revision + 1,
    } });
    expect(database.find(ownerId, record.itemType, record.itemId)?.notes).toBe("Recovered without losing the earlier record.");
    database.close();
  });

  it("leaves the owner claim pending until the account is verified", () => {
    const databasePath = makePath();
    const timestamp = Date.now() - 1000;
    seedPriorDatabase(databasePath, ["0001_create_learning_progress.sql"], [{ ...record, createdAt: timestamp, updatedAt: timestamp }]);
    const database = createDatabase(databasePath);
    database.orm.update(authUser).set({ emailVerified: false }).where(eq(authUser.id, ownerId)).run();

    expect(database.claimLegacyProgress(ownerId)).toBe(0);
    expect(database.list(ownerId)).toEqual([]);

    database.orm.update(authUser).set({ emailVerified: true }).where(eq(authUser.id, ownerId)).run();
    expect(database.claimLegacyProgress(ownerId)).toBe(1);
    expect(database.orm.select({ role: authUser.role }).from(authUser).where(eq(authUser.id, ownerId)).get()).toEqual({ role: "admin" });
    expect(database.find(ownerId, record.itemType, record.itemId)).toMatchObject({ notes: record.notes });
    expect(database.claimLegacyProgress(ownerId)).toBe(0);
    database.close();
  });

  it("round-trips a valid Unicode backup larger than the former one-megabyte limit", () => {
    const timestamp = Date.now();
    const field = "界🙂\u0000".repeat(750);
    const lessonIds = modules.flatMap((learningModule) => learningModule.lessons.map(({ id }) => id)).slice(0, 60);
    const payload = {
      version: 3 as const,
      exportedAt: new Date(timestamp).toISOString(),
      records: lessonIds.map((itemId) => ({
        itemType: "lesson" as const,
        itemId,
        status: "in_progress" as const,
        comfort: null,
        notes: field,
        evidence: field,
        repositoryUrl: "",
        updatedAt: timestamp,
      })),
    };
    const serialized = JSON.stringify(payload);
    const byteLength = new TextEncoder().encode(serialized).byteLength;
    expect(byteLength).toBeGreaterThan(1_000_000);
    expect(byteLength).toBeLessThanOrEqual(maxBackupBytes);
    const validated = progressImportSchema.parse(JSON.parse(serialized));

    const database = createDatabase();
    expect(database.mergeMany(ownerId, validated.records).records).toHaveLength(lessonIds.length);
    const reExported = {
      version: 3,
      exportedAt: new Date().toISOString(),
      records: database.list(ownerId).map(({ itemType, itemId, status, comfort, notes, evidence, repositoryUrl, updatedAt, taskObservations }) => ({
        itemType,
        itemId,
        status,
        comfort,
        notes,
        evidence,
        repositoryUrl,
        updatedAt,
        taskObservations,
      })),
    };
    const restored = progressImportSchema.parse(JSON.parse(JSON.stringify(reExported)));
    expect(restored.records).toHaveLength(lessonIds.length);
    expect(restored.records[0]?.notes).toBe(field);
    expect(restored.records[0]?.evidence).toBe(field);
    database.close();
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
    expect(database.save(ownerId, oldA02)).toMatchObject({
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
    expect(database.save(ownerId, project)).toMatchObject({
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
