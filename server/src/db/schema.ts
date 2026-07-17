import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { Attributes, LevelData } from "@rpg/protocol";

// Table/column names mirror the schema Prisma previously owned (PascalCase
// tables, camelCase columns, `UserRole` enum) so this maps onto the existing
// Neon database without a rename. V0 adds the first slice of the world model:
// characters, maps/levels/revisions, and the forum.

export const userRole = pgEnum("UserRole", ["User", "Admin"]);

export const users = pgTable("User", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: varchar("name", { length: 60 }).notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isOnline: boolean("isOnline").default(false),
  role: userRole("role").default("User"),
  refreshToken: text("refreshToken"),
});

export const chatMessages = pgTable("ChatMessage", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  modifiedAt: timestamp("modifiedAt", { precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id),
  characterName: text("characterName").notNull(),
  characterId: text("characterId").notNull(),
  content: text("content").notNull(),
});

// --- Characters --------------------------------------------------------------

// Race/size/attribute semantics live in @rpg/protocol registries for V0
// (Phase 5 promotes them to Race/AttributeDefinition tables).
export const characters = pgTable("Character", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 40 }).notNull(),
  raceId: text("raceId").notNull(),
  gender: text("gender").notNull(),
  sizeClass: text("sizeClass").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  credits: integer("credits").notNull().default(500),
  attributes: jsonb("attributes").$type<Attributes>().notNull(),
  bio: text("bio"),
});

// --- Maps & levels ------------------------------------------------------------

export const mapKind = pgEnum("MapKind", [
  "EXTERIOR",
  "BUILDING",
  "TRANSPORT",
  "LIMBO",
]);

export const maps = pgTable("Map", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: varchar("name", { length: 80 }).notNull(),
  kind: mapKind("kind").notNull().default("EXTERIOR"),
  createdBy: uuid("createdBy").references(() => users.id),
});

export const mapLevels = pgTable("MapLevel", {
  id: uuid("id").primaryKey().defaultRandom(),
  mapId: uuid("mapId")
    .notNull()
    .references(() => maps.id),
  z: integer("z").notNull().default(0),
  name: varchar("name", { length: 80 }).notNull().default("Ground"),
  version: integer("version").notNull().default(1),
  data: jsonb("data").$type<LevelData>().notNull(),
});

// Every editor save records a revision; revert is one row-copy (Part X).
export const mapLevelRevisions = pgTable("MapLevelRevision", {
  id: serial("id").primaryKey(),
  levelId: uuid("levelId")
    .notNull()
    .references(() => mapLevels.id),
  version: integer("version").notNull(),
  editedBy: uuid("editedBy").references(() => users.id),
  data: jsonb("data").$type<LevelData>().notNull(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
});

// --- Forum --------------------------------------------------------------------

// Forum identity is the account (User.name), not a character: it is the
// out-of-character space where players coordinate.
export const forumCategories = pgTable("ForumCategory", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sortOrder").notNull().default(0),
});

export const forumThreads = pgTable("ForumThread", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId")
    .notNull()
    .references(() => forumCategories.id),
  authorId: uuid("authorId")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 140 }).notNull(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  lastPostAt: timestamp("lastPostAt", { precision: 3 }).notNull().defaultNow(),
});

export const forumPosts = pgTable("ForumPost", {
  id: serial("id").primaryKey(),
  threadId: integer("threadId")
    .notNull()
    .references(() => forumThreads.id),
  authorId: uuid("authorId")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
});

// --- Relations ----------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  gameChatHistory: many(chatMessages),
  characters: many(characters),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
}));

export const mapsRelations = relations(maps, ({ many }) => ({
  levels: many(mapLevels),
}));

export const mapLevelsRelations = relations(mapLevels, ({ one, many }) => ({
  map: one(maps, {
    fields: [mapLevels.mapId],
    references: [maps.id],
  }),
  revisions: many(mapLevelRevisions),
}));

export const mapLevelRevisionsRelations = relations(
  mapLevelRevisions,
  ({ one }) => ({
    level: one(mapLevels, {
      fields: [mapLevelRevisions.levelId],
      references: [mapLevels.id],
    }),
  }),
);

export const forumCategoriesRelations = relations(
  forumCategories,
  ({ many }) => ({
    threads: many(forumThreads),
  }),
);

export const forumThreadsRelations = relations(
  forumThreads,
  ({ one, many }) => ({
    category: one(forumCategories, {
      fields: [forumThreads.categoryId],
      references: [forumCategories.id],
    }),
    author: one(users, {
      fields: [forumThreads.authorId],
      references: [users.id],
    }),
    posts: many(forumPosts),
  }),
);

export const forumPostsRelations = relations(forumPosts, ({ one }) => ({
  thread: one(forumThreads, {
    fields: [forumPosts.threadId],
    references: [forumThreads.id],
  }),
  author: one(users, {
    fields: [forumPosts.authorId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type GameMap = typeof maps.$inferSelect;
export type MapLevel = typeof mapLevels.$inferSelect;
export type ForumCategory = typeof forumCategories.$inferSelect;
export type ForumThread = typeof forumThreads.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
