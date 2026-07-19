// Local map types, formerly imported from an out-of-repo `../project/` folder.
// A cell is either a tile id (0 = floor, 1 = wall) or a string marker such as
// a zone key ('z1') or an 'exit'. The richer building/zone model arrives in
// Phase 4; this is the minimal shape the Phase 0 renderer needs.

export type Cell = number | string;

export interface MapData {
  layout: Cell[][];
  startPosition: { x: number; y: number };
  zonePositions?: Record<string, { x: number; y: number }>;
}
