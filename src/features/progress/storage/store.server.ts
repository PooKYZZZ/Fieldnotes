import "server-only";

import path from "node:path";
import { createProgressDatabase } from "@/features/progress/storage/database";
import type { ProgressInput } from "@/features/progress/model";

type ProgressDatabase = ReturnType<typeof createProgressDatabase>;
let database: ProgressDatabase | undefined;

function getDatabase(): ProgressDatabase {
  if (!database) {
    const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), ".data", "lms.sqlite");
    const opened = createProgressDatabase(databasePath, path.join(process.cwd(), "migrations"));
    try {
      const configuredOwnerEmail = process.env.FIELDNOTES_OWNER_EMAIL?.trim();
      const ownerId = configuredOwnerEmail ? opened.findVerifiedUserIdByEmail(configuredOwnerEmail) : undefined;
      if (ownerId) opened.claimLegacyProgress(ownerId);
    } catch (error) {
      opened.close();
      throw error;
    }
    database = opened;
  }
  return database;
}

export const listProgress = (userId: string) => getDatabase().list(userId);
export const findProgress = (userId: string, itemType: ProgressInput["itemType"], itemId: string) => getDatabase().find(userId, itemType, itemId);
export const saveProgress = (userId: string, input: ProgressInput) => getDatabase().save(userId, input);
export const saveProgressIfCurrent = (userId: string, input: ProgressInput, expectedRevision: number | null) => getDatabase().saveIfCurrent(userId, input, expectedRevision);
export const saveProgressMany = (userId: string, inputs: ProgressInput[]) => getDatabase().saveMany(userId, inputs);
export const mergeProgressMany = (userId: string, inputs: Array<ProgressInput & { updatedAt: number }>) => getDatabase().mergeMany(userId, inputs);
export const getAuthDatabase = () => getDatabase().orm;
export const prepareOwnerProgress = (userId: string) => getDatabase().claimLegacyProgress(userId);
export const listProgressSummary = (userId: string) => getDatabase().listSummary(userId);
export const checkDatabase = () => getDatabase().health();

