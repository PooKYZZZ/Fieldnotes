import { afterEach, describe, expect, it } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createProgressDatabase } from "@/features/progress/storage/database";
import type { ProgressInput } from "@/features/progress/model";

const migrationDirectory = path.join(process.cwd(), "migrations");
const temporaryDirectories: string[] = [];
const makePath = () => {
  const directory = mkdtempSync(path.join(tmpdir(), "devops-fieldnotes-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "progress.sqlite");
};

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
    const directory = path.dirname(databasePath);
    const oldMigrations = path.join(directory, "old-migrations");
    mkdirSync(oldMigrations);
    copyFileSync(path.join(migrationDirectory, "0001_create_learning_progress.sql"), path.join(oldMigrations, "0001_create_learning_progress.sql"));

    const beforeMigration = createProgressDatabase(databasePath, oldMigrations);
    const activity: ProgressInput = { ...record, itemType: "activity", itemId: "A01", notes: "Activity notes", evidence: "Activity evidence" };
    beforeMigration.save(record);
    beforeMigration.save(activity);
    beforeMigration.close();

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

