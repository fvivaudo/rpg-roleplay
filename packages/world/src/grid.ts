// Pure grid helpers. Per the design's "pure-function-first" testing philosophy,
// the tile-math primitives movement, ranges and raycasting will build on live
// here as side-effect-free functions with unit tests. This is the seed of that
// module; Phase 1+ grows it (A*, raycast attenuation, per-size collision).

export interface Coord {
  x: number;
  y: number;
}

/** 4-connected (orthogonal) grid distance. */
export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** 8-connected (king-move) grid distance. */
export function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Whether `b` is exactly one orthogonal step from `a`. */
export function isAdjacent(a: Coord, b: Coord): boolean {
  return manhattan(a, b) === 1;
}
