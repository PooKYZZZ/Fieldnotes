import "server-only";

import path from "node:path";
import { createProgressDatabase } from "@/features/progress/storage/database";
import type { ProgressInput } from "@/features/progress/model";

type ProgressDatabase = ReturnType<typeof createProgressDatabase>;
let database: ProgressDatabase | undefined;

function getDatabase(): ProgressDatabase {
  if (!database) {
    const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), ".data", "lms.sqlite");
    database = createProgressDatabase(databasePath, path.join(process.cwd(), "migrations"));
  }
  return database;
}

export const listProgress = (userId: string) => getDatabase().list(userId);
export const findProgress = (userId: string, itemType: ProgressInput["itemType"], itemId: string) => getDatabase().find(userId, itemType, itemId);
export const saveProgress = (userId: string, input: ProgressInput) => getDatabase().save(userId, input);
export const saveProgressMany = (userId: string, inputs: ProgressInput[]) => getDatabase().saveMany(userId, inputs);
export const getAuthDatabase = () => getDatabase().orm;
export const prepareOwnerProgress = (userId: string) => {
  getDatabase().ensureOwnerRole(userId);
  return getDatabase().claimLegacyProgress(userId);
};
export const checkDatabase = () => getDatabase().health();

