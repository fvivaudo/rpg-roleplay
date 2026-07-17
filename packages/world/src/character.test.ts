import { describe, expect, test } from "bun:test";

import type { Attributes } from "@rpg/protocol";
import {
  applyRacialMods,
  deriveStats,
  pointsSpent,
  validateCreation,
} from "./character";

const balanced: Attributes = { body: 3, agility: 3, perception: 3, logic: 3 };

describe("validateCreation", () => {
  test("accepts a balanced human", () => {
    expect(
      validateCreation({
        name: "Kestrel",
        raceId: "human",
        sizeClass: "M",
        attributes: balanced,
      }),
    ).toEqual([]);
  });

  test("rejects overspent budgets", () => {
    const problems = validateCreation({
      name: "Kestrel",
      raceId: "human",
      sizeClass: "M",
      attributes: { body: 5, agility: 5, perception: 3, logic: 3 },
    });
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain("exactly 12");
  });

  test("rejects attribute values outside 1-5", () => {
    const problems = validateCreation({
      name: "Kestrel",
      raceId: "human",
      sizeClass: "M",
      attributes: { body: 0, agility: 6, perception: 3, logic: 3 },
    });
    expect(problems.length).toBe(2);
  });

  test("rejects sizes outside the race range", () => {
    const problems = validateCreation({
      name: "Brick",
      raceId: "troll",
      sizeClass: "S",
      attributes: balanced,
    });
    expect(problems.some((p) => p.includes("size"))).toBe(true);
  });

  test("rejects unknown races and bad names", () => {
    const problems = validateCreation({
      name: "x",
      raceId: "gnome",
      sizeClass: "M",
      attributes: balanced,
    });
    expect(problems.some((p) => p.includes("Unknown race"))).toBe(true);
    expect(problems.some((p) => p.includes("name"))).toBe(true);
  });
});

describe("applyRacialMods", () => {
  test("troll gains body, loses logic and perception", () => {
    const effective = applyRacialMods(balanced, "troll");
    expect(effective).toEqual({ body: 5, agility: 3, perception: 2, logic: 2 });
  });

  test("human is unchanged", () => {
    expect(applyRacialMods(balanced, "human")).toEqual(balanced);
  });
});

describe("deriveStats", () => {
  test("derives from effective attributes", () => {
    const stats = deriveStats(balanced);
    expect(stats.maxHp).toBe(35);
    expect(stats.initiative).toBe(2);
    expect(stats.carryCapacity).toBe(30);
    expect(stats.moveBudget).toBe(5);
  });

  test("initiative clamps to 1-3", () => {
    expect(deriveStats({ ...balanced, agility: 1 }).initiative).toBe(1);
    expect(deriveStats({ ...balanced, agility: 5 }).initiative).toBe(3);
  });
});

test("pointsSpent sums the four attributes", () => {
  expect(pointsSpent(balanced)).toBe(12);
});
