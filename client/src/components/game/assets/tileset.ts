import { ImageSource } from 'excalibur';

// Load tileset from URL
export const tilesetImage = new ImageSource('https://i.imgur.com/FBvng3a.png');

// Define tile categories and their positions (each tile is 48x48)
export const TILES = {
  FLOORS: [
    // Row 1
    { x: 0, y: 0, width: 48, height: 48 },
    { x: 48, y: 0, width: 48, height: 48 },
    { x: 96, y: 0, width: 48, height: 48 },
    { x: 144, y: 0, width: 48, height: 48 },
    // Row 2
    { x: 0, y: 48, width: 48, height: 48 },
    { x: 48, y: 48, width: 48, height: 48 },
    { x: 96, y: 48, width: 48, height: 48 },
    { x: 144, y: 48, width: 48, height: 48 },
    // Row 3
    { x: 0, y: 96, width: 48, height: 48 },
    { x: 48, y: 96, width: 48, height: 48 },
    { x: 96, y: 96, width: 48, height: 48 },
    { x: 144, y: 96, width: 48, height: 48 },
  ],
  WALLS: [
    // Row 4
    { x: 0, y: 144, width: 48, height: 48 },
    { x: 48, y: 144, width: 48, height: 48 },
    { x: 96, y: 144, width: 48, height: 48 },
    { x: 144, y: 144, width: 48, height: 48 },
    // Row 5
    { x: 0, y: 192, width: 48, height: 48 },
    { x: 48, y: 192, width: 48, height: 48 },
    { x: 96, y: 192, width: 48, height: 48 },
    { x: 144, y: 192, width: 48, height: 48 },
    // Row 6
    { x: 0, y: 240, width: 48, height: 48 },
    { x: 48, y: 240, width: 48, height: 48 },
    { x: 96, y: 240, width: 48, height: 48 },
    { x: 144, y: 240, width: 48, height: 48 },
  ],
  DECORATIONS: [
    // Row 7-12
    ...Array(6).fill(null).flatMap((_, row) => 
      Array(16).fill(null).map((_, col) => ({
        x: col * 48,
        y: (row + 6) * 48,
        width: 48,
        height: 48
      }))
    )
  ]
};