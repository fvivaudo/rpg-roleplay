import { describe, expect, test } from "bun:test";

import {
  createEmptyLevel,
  findPath,
  isWalkable,
  validateLevelData,
} from "./level";

describe("createEmptyLevel", () => {
  test("builds consistent grids with a centered spawn", () => {
    const level = createEmptyLevel(6, 4);
    expect(level.layers.floor.length).toBe(4);
    expect(level.layers.floor[0].length).toBe(6);
    expect(level.spawn).toEqual({ x: 3, y: 2 });
    expect(validateLevelData(level)).toEqual([]);
  });
});

describe("validateLevelData", () => {
  test("flags mismatched layer dimensions", () => {
    const level = createEmptyLevel(4, 4);
    level.layers.walls = [[0]];
    expect(validateLevelData(level).length).toBeGreaterThan(0);
  });

  test("flags out-of-bounds spawn", () => {
    const level = createEmptyLevel(4, 4);
    level.spawn = { x: 9, y: 0 };
    expect(validateLevelData(level).some((p) => p.includes("Spawn"))).toBe(true);
  });

  test("flags absurd dimensions", () => {
    const level = createEmptyLevel(4, 4);
    level.width = 9999;
    expect(validateLevelData(level).length).toBeGreaterThan(0);
  });
});

describe("isWalkable / findPath", () => {
  // 5x3, wall column at x=2 with a gap at y=2:
  // . . # . .
  // . . # . .
  // . . . . .
  const level = createEmptyLevel(5, 3);
  level.collision[0][2] = 1;
  level.collision[1][2] = 1;

  test("collision blocks walkability, bounds are enforced", () => {
    expect(isWalkable(level, { x: 2, y: 0 })).toBe(false);
    expect(isWalkable(level, { x: 2, y: 2 })).toBe(true);
    expect(isWalkable(level, { x: -1, y: 0 })).toBe(false);
    expect(isWalkable(level, { x: 0, y: 3 })).toBe(false);
  });

  test("path routes around the wall through the gap", () => {
    const path = findPath(level, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    // Shortest route dips to y=2 and back: length 8.
    expect(path!.length).toBe(8);
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 0 });
    // Every step is walkable and orthogonally adjacent to the previous.
    let prev = { x: 0, y: 0 };
    for (const step of path!) {
      expect(isWalkable(level, step)).toBe(true);
      expect(Math.abs(step.x - prev.x) + Math.abs(step.y - prev.y)).toBe(1);
      prev = step;
    }
  });

  test("unreachable targets return null", () => {
    const sealed = createEmptyLevel(5, 3);
    for (let y = 0; y < 3; y++) sealed.collision[y][2] = 1;
    expect(findPath(sealed, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeNull();
  });

  test("degenerate cases", () => {
    expect(findPath(level, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
    expect(findPath(level, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });
});
