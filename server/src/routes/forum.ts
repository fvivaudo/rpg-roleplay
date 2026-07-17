import { Elysia, t } from "elysia";
import { asc, count, desc, eq } from "drizzle-orm";

import { db, schema } from "../lib";
import { authPlugin } from "../plugin";

// The forum speaks with ACCOUNT names (User.name), never character names —
// it is the out-of-character space (see DESIGN.md identity rules).

export const forumRoutes = new Elysia({ prefix: "/forum" })
  .use(authPlugin)
  .get("/categories", async () => {
    const categories = await db
      .select({
        id: schema.forumCategories.id,
        name: schema.forumCategories.name,
        description: schema.forumCategories.description,
        sortOrder: schema.forumCategories.sortOrder,
        threadCount: count(schema.forumThreads.id),
      })
      .from(schema.forumCategories)
      .leftJoin(
        schema.forumThreads,
        eq(schema.forumThreads.categoryId, schema.forumCategories.id),
      )
      .groupBy(schema.forumCategories.id)
      .orderBy(asc(schema.forumCategories.sortOrder));

    return { message: "Categories fetched", data: { categories } };
  })
  .get(
    "/categories/:id/threads",
    async ({ params, error }) => {
      const [category] = await db
        .select()
        .from(schema.forumCategories)
        .where(eq(schema.forumCategories.id, params.id))
        .limit(1);
      if (!category) {
        return error(404, { name: "Error", message: "Category not found" });
      }

      const threads = await db
        .select({
          id: schema.forumThreads.id,
          categoryId: schema.forumThreads.categoryId,
          title: schema.forumThreads.title,
          authorName: schema.users.name,
          createdAt: schema.forumThreads.createdAt,
          lastPostAt: schema.forumThreads.lastPostAt,
          postCount: count(schema.forumPosts.id),
        })
        .from(schema.forumThreads)
        .innerJoin(schema.users, eq(schema.users.id, schema.forumThreads.authorId))
        .leftJoin(
          schema.forumPosts,
          eq(schema.forumPosts.threadId, schema.forumThreads.id),
        )
        .where(eq(schema.forumThreads.categoryId, params.id))
        .groupBy(schema.forumThreads.id, schema.users.name)
        .orderBy(desc(schema.forumThreads.lastPostAt));

      return { message: "Threads fetched", data: { category, threads } };
    },
    { params: t.Object({ id: t.Integer() }) },
  )
  .post(
    "/categories/:id/threads",
    async ({ user, params, body, error }) => {
      const [category] = await db
        .select()
        .from(schema.forumCategories)
        .where(eq(schema.forumCategories.id, params.id))
        .limit(1);
      if (!category) {
        return error(404, { name: "Error", message: "Category not found" });
      }

      const [thread] = await db
        .insert(schema.forumThreads)
        .values({
          categoryId: params.id,
          authorId: user.id,
          title: body.title.trim(),
        })
        .returning();

      await db.insert(schema.forumPosts).values({
        threadId: thread.id,
        authorId: user.id,
        content: body.content.trim(),
      });

      return { message: "Thread created", data: { thread } };
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 140 }),
        content: t.String({ minLength: 1, maxLength: 20000 }),
      }),
    },
  )
  .get(
    "/threads/:id",
    async ({ params, error }) => {
      const [thread] = await db
        .select()
        .from(schema.forumThreads)
        .where(eq(schema.forumThreads.id, params.id))
        .limit(1);
      if (!thread) {
        return error(404, { name: "Error", message: "Thread not found" });
      }

      const posts = await db
        .select({
          id: schema.forumPosts.id,
          threadId: schema.forumPosts.threadId,
          authorName: schema.users.name,
          content: schema.forumPosts.content,
          createdAt: schema.forumPosts.createdAt,
        })
        .from(schema.forumPosts)
        .innerJoin(schema.users, eq(schema.users.id, schema.forumPosts.authorId))
        .where(eq(schema.forumPosts.threadId, params.id))
        .orderBy(asc(schema.forumPosts.createdAt));

      return { message: "Thread fetched", data: { thread, posts } };
    },
    { params: t.Object({ id: t.Integer() }) },
  )
  .post(
    "/threads/:id/posts",
    async ({ user, params, body, error }) => {
      const [thread] = await db
        .select()
        .from(schema.forumThreads)
        .where(eq(schema.forumThreads.id, params.id))
        .limit(1);
      if (!thread) {
        return error(404, { name: "Error", message: "Thread not found" });
      }

      const [post] = await db
        .insert(schema.forumPosts)
        .values({
          threadId: thread.id,
          authorId: user.id,
          content: body.content.trim(),
        })
        .returning();

      await db
        .update(schema.forumThreads)
        .set({ lastPostAt: post.createdAt })
        .where(eq(schema.forumThreads.id, thread.id));

      return { message: "Post created", data: { post } };
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({ content: t.String({ minLength: 1, maxLength: 20000 }) }),
    },
  );
