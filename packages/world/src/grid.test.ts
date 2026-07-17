import { describe, expect, it } from "bun:test";

import { chebyshev, isAdjacent, manhattan } from "./grid";

describe("grid distances", () => {
  it("manhattan sums orthogonal deltas", () => {
    expect(manhattan({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    expect(manhattan({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it("chebyshev takes the larger axis delta", () => {
    expect(chebyshev({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(4);
    expect(chebyshev({ x: 0, y: 0 }, { x: -5, y: 1 })).toBe(5);
  });

  it("isAdjacent is true only for a single orthogonal step", () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 2 })).toBe(true);
    expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
    expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(false);
  });
});
