import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { authUser } from "@/features/auth/storage/schema";

export const learningProgress = sqliteTable(
  "learning_progress",
  {
    userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    status: text("status").notNull(),
    comfort: text("comfort"),
    notes: text("notes").notNull().default(""),
    evidence: text("evidence").notNull().default(""),
    repositoryUrl: text("repository_url").notNull().default(""),
    taskObservations: text("task_observations").notNull().default("{}"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.itemType, table.itemId] })],
);

