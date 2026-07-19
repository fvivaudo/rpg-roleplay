import { Elysia, t } from "elysia";
import { desc, eq } from "drizzle-orm";
import { validateCreation } from "@rpg/world";
import type { Attributes, Gender, SizeClass } from "@rpg/protocol";

import { db, schema } from "../lib";
import { authPlugin } from "../plugin";

const attributesSchema = t.Object({
  body: t.Integer(),
  agility: t.Integer(),
  perception: t.Integer(),
  logic: t.Integer(),
});

const createCharacterSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 40 }),
  raceId: t.String(),
  gender: t.Union([t.Literal("male"), t.Literal("female"), t.Literal("other")]),
  sizeClass: t.Union([t.Literal("S"), t.Literal("M"), t.Literal("L")]),
  attributes: attributesSchema,
  bio: t.Optional(t.String({ maxLength: 2000 })),
});

export const characterRoutes = new Elysia({ prefix: "/characters" })
  .use(authPlugin)
  .get("/", async ({ user }) => {
    const characters = await db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.userId, user.id))
      .orderBy(desc(schema.characters.createdAt));

    return { message: "Characters fetched", data: { characters } };
  })
  .post(
    "/",
    async ({ user, body, error }) => {
      // Game rules (point-buy budget, race size range) are validated by the
      // same shared pure function the creation UI runs.
      const problems = validateCreation({
        name: body.name,
        raceId: body.raceId,
        sizeClass: body.sizeClass as SizeClass,
        attributes: body.attributes as Attributes,
      });
      if (problems.length > 0) {
        return error(422, { name: "ValidationError", message: problems.join(" ") });
      }

      // V0 placeholder for the "one new character per 14 days" rule: cap the
      // roster at 5 characters per account instead.
      const existing = await db
        .select({ id: schema.characters.id })
        .from(schema.characters)
        .where(eq(schema.characters.userId, user.id));
      if (existing.length >= 5) {
        return error(409, {
          name: "Error",
          message: "Character limit reached (5 per account in V0).",
        });
      }

      const [character] = await db
        .insert(schema.characters)
        .values({
          userId: user.id,
          name: body.name.trim(),
          raceId: body.raceId,
          gender: body.gender as Gender,
          sizeClass: body.sizeClass,
          attributes: body.attributes as Attributes,
          bio: body.bio ?? null,
        })
        .returning();

      console.log(`Character "${character.name}" created for ${user.name}`);
      return { message: "Character created", data: { character } };
    },
    { body: createCharacterSchema },
  )
  .get(
    "/:id",
    async ({ user, params, error }) => {
      const [character] = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, params.id))
        .limit(1);

      if (!character || character.userId !== user.id) {
        return error(404, { name: "Error", message: "Character not found" });
      }
      return { message: "Character fetched", data: { character } };
    },
    { params: t.Object({ id: t.String({ format: "uuid" }) }) },
  );
