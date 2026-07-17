// Pure character-creation and stat rules, shared by the creation UI and the
// server-side validator. Registry-driven definitions replace this in Phase 5.

import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  ATTRIBUTE_POINT_BUDGET,
  type Attributes,
  getRace,
  type SizeClass,
} from "@rpg/protocol";

export interface CreationValidationInput {
  name: string;
  raceId: string;
  sizeClass: SizeClass;
  attributes: Attributes;
}

export function pointsSpent(attributes: Attributes): number {
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + (attributes[key] ?? 0), 0);
}

/** Returns a list of human-readable problems; empty = valid. */
export function validateCreation(input: CreationValidationInput): string[] {
  const problems: string[] = [];

  const name = input.name.trim();
  if (name.length < 2 || name.length > 40) {
    problems.push("Character name must be 2-40 characters.");
  }

  const race = getRace(input.raceId);
  if (!race) {
    problems.push(`Unknown race "${input.raceId}".`);
  } else if (!race.sizeRange.includes(input.sizeClass)) {
    problems.push(
      `${race.name} size must be one of ${race.sizeRange.join("/")}.`,
    );
  }

  for (const key of ATTRIBUTE_KEYS) {
    const value = input.attributes[key];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < ATTRIBUTE_MIN ||
      value > ATTRIBUTE_MAX
    ) {
      problems.push(
        `${key} must be an integer between ${ATTRIBUTE_MIN} and ${ATTRIBUTE_MAX}.`,
      );
    }
  }

  if (problems.length === 0 && pointsSpent(input.attributes) !== ATTRIBUTE_POINT_BUDGET) {
    problems.push(
      `Attribute points must total exactly ${ATTRIBUTE_POINT_BUDGET} (spent ${pointsSpent(input.attributes)}).`,
    );
  }

  return problems;
}

/** Point-buy spend plus racial modifiers = the character's effective sheet. */
export function applyRacialMods(
  attributes: Attributes,
  raceId: string,
): Attributes {
  const race = getRace(raceId);
  const result = { ...attributes };
  if (race) {
    for (const key of ATTRIBUTE_KEYS) {
      result[key] = (result[key] ?? 0) + (race.attributeMods[key] ?? 0);
    }
  }
  return result;
}

export interface DerivedStats {
  maxHp: number;
  initiative: number;
  carryCapacity: number;
  moveBudget: number;
}

/** Placeholder formulas (DESIGN.md Part VII); tuned later, kept pure now. */
export function deriveStats(effective: Attributes): DerivedStats {
  return {
    maxHp: 20 + effective.body * 5,
    initiative: Math.max(1, Math.min(3, Math.ceil(effective.agility / 2))),
    carryCapacity: effective.body * 10,
    moveBudget: 2 + effective.agility,
  };
}
