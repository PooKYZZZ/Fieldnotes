import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const learningProgress = sqliteTable(
  "learning_progress",
  {
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
  (table) => [primaryKey({ columns: [table.itemType, table.itemId] })],
);

