// Shared game-domain types and static registries for the V0 vertical slice.
// Race/attribute data lives here (not in the DB yet) so client and server
// validate character creation against the same source; it migrates to the
// Race/AttributeDefinition tables in Phase 5.

export type SizeClass = "S" | "M" | "L";
export type Gender = "male" | "female" | "other";

export type AttributeKey = "body" | "agility" | "perception" | "logic";

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  "body",
  "agility",
  "perception",
  "logic",
];

export type Attributes = Record<AttributeKey, number>;

/** Point-buy rules: every attribute starts at MIN, spend up to the budget. */
export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 5;
export const ATTRIBUTE_POINT_BUDGET = 12; // total across the four attributes

export interface RaceDef {
  id: string;
  name: string;
  /** Size classes a character of this race may pick at creation. */
  sizeRange: SizeClass[];
  /** Flat modifiers applied on top of the point-buy spend. */
  attributeMods: Partial<Attributes>;
  description: string;
}

// Launch roster: the Shadowrun metatype spread (DESIGN.md Part IV), chosen to
// exercise the size system.
export const RACES: RaceDef[] = [
  {
    id: "human",
    name: "Human",
    sizeRange: ["S", "M", "L"],
    attributeMods: {},
    description:
      "Baseline metatype. No modifiers, the full size range — the adaptable default of the sprawl.",
  },
  {
    id: "elf",
    name: "Elf",
    sizeRange: ["S", "M"],
    attributeMods: { agility: 1, body: -1 },
    description:
      "Slender and quick. Sharp in the alleys, fragile in a brawl.",
  },
  {
    id: "dwarf",
    name: "Dwarf",
    sizeRange: ["S", "M"],
    attributeMods: { body: 1, agility: -1 },
    description:
      "Compact and durable. Fits through the ducts the towers forgot.",
  },
  {
    id: "ork",
    name: "Ork",
    sizeRange: ["M", "L"],
    attributeMods: { body: 1, logic: -1 },
    description: "Broad-framed muscle of the undercity.",
  },
  {
    id: "troll",
    name: "Troll",
    sizeRange: ["M", "L"],
    attributeMods: { body: 2, logic: -1, perception: -1 },
    description:
      "Towering silhouette. Doors are a suggestion, cover is for other people.",
  },
];

export const getRace = (raceId: string): RaceDef | undefined =>
  RACES.find((r) => r.id === raceId);

export interface Character {
  id: string;
  userId: string;
  name: string;
  raceId: string;
  gender: Gender;
  sizeClass: SizeClass;
  level: number;
  xp: number;
  credits: number;
  attributes: Attributes;
  bio: string | null;
  createdAt: Date | string;
}

// --- Map / level format -----------------------------------------------------

export const TILE_SIZE = 48;
export const ATLAS_COLUMNS = 16;
export const ATLAS_ROWS = 12;

export type TileLayerName = "floor" | "walls" | "objects";
export const TILE_LAYERS: TileLayerName[] = ["floor", "walls", "objects"];

/**
 * The jsonb payload of a MapLevel (DESIGN.md Part II, trimmed to V0).
 * Tile values index the 16x12 atlas (row-major, `row * 16 + col`); -1 = empty.
 * `collision` is an explicit painted layer: 1 = blocked, 0 = walkable.
 */
export interface LevelData {
  width: number;
  height: number;
  tileSize: number;
  layers: Record<TileLayerName, number[][]>;
  collision: number[][];
  spawn: { x: number; y: number };
}

export type MapKind = "EXTERIOR" | "BUILDING" | "TRANSPORT" | "LIMBO";

export interface MapSummary {
  id: string;
  name: string;
  kind: MapKind;
  updatedAt: Date | string;
}

export interface MapLevelDTO {
  id: string;
  mapId: string;
  z: number;
  name: string;
  version: number;
  data: LevelData;
}

export interface MapWithLevels extends MapSummary {
  levels: MapLevelDTO[];
}

// --- Forum ------------------------------------------------------------------

// Forum identity is the ACCOUNT name (User.name), deliberately separate from
// character names: players talk out-of-character here.

export interface ForumCategory {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  threadCount: number;
}

export interface ForumThreadSummary {
  id: number;
  categoryId: number;
  title: string;
  authorName: string;
  createdAt: Date | string;
  postCount: number;
  lastPostAt: Date | string;
}

export interface ForumPost {
  id: number;
  threadId: number;
  authorName: string;
  content: string;
  createdAt: Date | string;
}

export interface ForumThreadDetail {
  id: number;
  categoryId: number;
  title: string;
  createdAt: Date | string;
  posts: ForumPost[];
}
