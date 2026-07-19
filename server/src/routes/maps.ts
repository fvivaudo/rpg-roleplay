import { Elysia, t } from "elysia";
import { asc, desc, eq } from "drizzle-orm";
import { createEmptyLevel, validateLevelData } from "@rpg/world";
import type { LevelData } from "@rpg/protocol";

import { db, schema } from "../lib";
import { authPlugin } from "../plugin";

// Reads are open to any authenticated account; map creation and level saves
// are Admin-only (the editor is the GM tier of Part X — the sandboxed player
// tier arrives in Phase 11 with its own constraints). Grant yourself access
// with: UPDATE "User" SET role = 'Admin' WHERE email = '...';

const editForbidden = {
  name: "Error",
  message: "Map editing requires the Admin role",
} as const;

export const mapRoutes = new Elysia({ prefix: "/maps" })
  .use(authPlugin)
  .get("/", async () => {
    const maps = await db
      .select({
        id: schema.maps.id,
        name: schema.maps.name,
        kind: schema.maps.kind,
        updatedAt: schema.maps.updatedAt,
      })
      .from(schema.maps)
      .orderBy(desc(schema.maps.updatedAt));

    return { message: "Maps fetched", data: { maps } };
  })
  .get(
    "/:id",
    async ({ params, error }) => {
      const map = await db.query.maps.findFirst({
        where: eq(schema.maps.id, params.id),
        with: { levels: { orderBy: asc(schema.mapLevels.z) } },
      });
      if (!map) return error(404, { name: "Error", message: "Map not found" });
      return { message: "Map fetched", data: { map } };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) },
  )
  .post(
    "/",
    async ({ user, body, error }) => {
      if (user.role !== "Admin") return error(403, editForbidden);

      const [map] = await db
        .insert(schema.maps)
        .values({ name: body.name.trim(), kind: body.kind, createdBy: user.id })
        .returning();

      const [level] = await db
        .insert(schema.mapLevels)
        .values({
          mapId: map.id,
          z: 0,
          name: "Ground",
          version: 1,
          data: createEmptyLevel(body.width, body.height),
        })
        .returning();

      console.log(`Map "${map.name}" created by ${user.name}`);
      return { message: "Map created", data: { map: { ...map, levels: [level] } } };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 80 }),
        kind: t.Union([
          t.Literal("EXTERIOR"),
          t.Literal("BUILDING"),
          t.Literal("TRANSPORT"),
          t.Literal("LIMBO"),
        ]),
        width: t.Integer({ minimum: 2, maximum: 200 }),
        height: t.Integer({ minimum: 2, maximum: 200 }),
      }),
    },
  )
  // The one write path for level geometry (Part X): save jsonb, bump version,
  // record a revision. Room hot-push joins in once rooms exist.
  .put(
    "/levels/:levelId",
    async ({ user, params, body, error }) => {
      if (user.role !== "Admin") return error(403, editForbidden);

      const data = body.data as LevelData;
      const problems = validateLevelData(data);
      if (problems.length > 0) {
        return error(422, { name: "ValidationError", message: problems.join(" ") });
      }

      const [level] = await db
        .select()
        .from(schema.mapLevels)
        .where(eq(schema.mapLevels.id, params.levelId))
        .limit(1);
      if (!level) {
        return error(404, { name: "Error", message: "Level not found" });
      }

      const nextVersion = level.version + 1;
      const [updated] = await db
        .update(schema.mapLevels)
        .set({ data, version: nextVersion })
        .where(eq(schema.mapLevels.id, level.id))
        .returning();

      await db.insert(schema.mapLevelRevisions).values({
        levelId: level.id,
        version: nextVersion,
        editedBy: user.id,
        data,
      });

      // Touch the parent map so list ordering reflects recent edits.
      await db
        .update(schema.maps)
        .set({ updatedAt: new Date() })
        .where(eq(schema.maps.id, level.mapId));

      return { message: "Level saved", data: { level: updated } };
    },
    {
      params: t.Object({ levelId: t.String({ format: "uuid" }) }),
      // Validated structurally by validateLevelData; t.Unknown keeps the
      // typebox schema from double-describing the grid shape.
      body: t.Object({ data: t.Unknown() }),
    },
  );
