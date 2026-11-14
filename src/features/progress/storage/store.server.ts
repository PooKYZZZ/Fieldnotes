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

export const listProgress = () => getDatabase().list();
export const findProgress = (itemType: ProgressInput["itemType"], itemId: string) => getDatabase().find(itemType, itemId);
export const saveProgress = (input: ProgressInput) => getDatabase().save(input);
export const saveProgressMany = (inputs: ProgressInput[]) => getDatabase().saveMany(inputs);
export const checkDatabase = () => getDatabase().health();

