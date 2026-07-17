// Pure level-data helpers: construction, walkability, and BFS pathfinding.
// Both the client (editor, click-to-move) and the server (validation, seeding)
// operate on the same LevelData shape through these functions.

import { TILE_LAYERS, TILE_SIZE, type LevelData } from "@rpg/protocol";
import type { Coord } from "./grid";

const grid = (width: number, height: number, fill: number): number[][] =>
  Array.from({ length: height }, () => Array<number>(width).fill(fill));

/** An empty level: bare floor tile 0 everywhere, walls/objects empty. */
export function createEmptyLevel(width: number, height: number): LevelData {
  return {
    width,
    height,
    tileSize: TILE_SIZE,
    layers: {
      floor: grid(width, height, 0),
      walls: grid(width, height, -1),
      objects: grid(width, height, -1),
    },
    collision: grid(width, height, 0),
    spawn: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
  };
}

/** Structural sanity check for editor saves arriving over the wire. */
export function validateLevelData(data: LevelData): string[] {
  const problems: string[] = [];
  const { width, height } = data;

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 2 ||
    height < 2 ||
    width > 200 ||
    height > 200
  ) {
    problems.push("Level dimensions must be integers between 2 and 200.");
    return problems;
  }

  const checkGrid = (name: string, g: number[][] | undefined) => {
    if (!Array.isArray(g) || g.length !== height) {
      problems.push(`Layer "${name}" must have ${height} rows.`);
      return;
    }
    for (const row of g) {
      if (!Array.isArray(row) || row.length !== width) {
        problems.push(`Layer "${name}" must have ${width} columns per row.`);
        return;
      }
      if (row.some((v) => typeof v !== "number" || !Number.isInteger(v))) {
        problems.push(`Layer "${name}" contains non-integer cells.`);
        return;
      }
    }
  };

  for (const layer of TILE_LAYERS) checkGrid(layer, data.layers?.[layer]);
  checkGrid("collision", data.collision);

  if (
    !data.spawn ||
    !Number.isInteger(data.spawn.x) ||
    !Number.isInteger(data.spawn.y) ||
    data.spawn.x < 0 ||
    data.spawn.x >= width ||
    data.spawn.y < 0 ||
    data.spawn.y >= height
  ) {
    problems.push("Spawn point must sit inside the level.");
  }

  return problems;
}

export function inBounds(level: LevelData, { x, y }: Coord): boolean {
  return x >= 0 && x < level.width && y >= 0 && y < level.height;
}

export function isWalkable(level: LevelData, coord: Coord): boolean {
  return inBounds(level, coord) && level.collision[coord.y][coord.x] !== 1;
}

const ORTHOGONAL: Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * 4-connected BFS shortest path. Returns the cell list from `from` (exclusive)
 * to `to` (inclusive), or null when unreachable. Plain BFS is exact on a
 * uniform-cost grid; A* replaces it when tile speeds land.
 */
export function findPath(
  level: LevelData,
  from: Coord,
  to: Coord,
): Coord[] | null {
  if (!isWalkable(level, to) || !inBounds(level, from)) return null;
  if (from.x === to.x && from.y === to.y) return [];

  const key = (c: Coord) => c.y * level.width + c.x;
  const cameFrom = new Map<number, number>();
  const queue: Coord[] = [from];
  cameFrom.set(key(from), -1);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const delta of ORTHOGONAL) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (!isWalkable(level, next) || cameFrom.has(key(next))) continue;
      cameFrom.set(key(next), key(current));
      if (next.x === to.x && next.y === to.y) {
        const path: Coord[] = [next];
        let cursor = key(current);
        while (cursor !== key(from) && cursor !== -1) {
          path.push({ x: cursor % level.width, y: Math.floor(cursor / level.width) });
          cursor = cameFrom.get(cursor)!;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}
