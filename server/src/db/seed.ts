import { createEmptyLevel } from "@rpg/world";

import { db } from "./index";
import * as schema from "./schema";

// Atlas indices (16-column atlas): row 0 col 0 = plain floor, row 3 col 0 =
// wall — the same pair the Phase 0 renderer used.
const FLOOR_TILE = 0;
const WALL_TILE = 48;

// The hand-authored Phase 0 district (formerly client defaultMaps.exterior):
// 1 = wall, 0 = open street. The z* markers become plain floor for now —
// interior zones are a Phase 4 concept.
const DISTRICT_LAYOUT: (number | string)[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

function districtLevelData() {
  const height = DISTRICT_LAYOUT.length;
  const width = DISTRICT_LAYOUT[0].length;
  const level = createEmptyLevel(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      level.layers.floor[y][x] = FLOOR_TILE;
      if (DISTRICT_LAYOUT[y][x] === 1) {
        level.layers.walls[y][x] = WALL_TILE;
        level.collision[y][x] = 1;
      }
    }
  }
  level.spawn = { x: 8, y: 8 };
  return level;
}

const FORUM_CATEGORIES = [
  {
    name: "Announcements",
    description: "News from the operators of Nekron.",
    sortOrder: 0,
  },
  {
    name: "General",
    description: "Out-of-character discussion between players.",
    sortOrder: 1,
  },
  {
    name: "Roleplay & Stories",
    description: "Character stories, rumors from the sprawl, event write-ups.",
    sortOrder: 2,
  },
  {
    name: "Help & Bug Reports",
    description: "Something broken or confusing? Post it here.",
    sortOrder: 3,
  },
];

/** Idempotent: only inserts when the corresponding table is empty. */
export async function seed() {
  const [existingMap] = await db.select().from(schema.maps).limit(1);
  if (!existingMap) {
    const [map] = await db
      .insert(schema.maps)
      .values({ name: "Neon District", kind: "EXTERIOR" })
      .returning();
    await db.insert(schema.mapLevels).values({
      mapId: map.id,
      z: 0,
      name: "Street",
      version: 1,
      data: districtLevelData(),
    });
    console.log(`Seeded map "Neon District" (${map.id})`);
  }

  const [existingCategory] = await db
    .select()
    .from(schema.forumCategories)
    .limit(1);
  if (!existingCategory) {
    await db.insert(schema.forumCategories).values(FORUM_CATEGORIES);
    console.log(`Seeded ${FORUM_CATEGORIES.length} forum categories`);
  }
}
