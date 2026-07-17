import { useEffect, useRef } from 'react';
import * as ex from 'excalibur';

import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  TILE_LAYERS,
  TILE_SIZE,
  type LevelData,
  type SizeClass,
} from '@rpg/protocol';
import { findPath, isWalkable } from '@rpg/world';

import { tilesetImage } from './assets/tileset';

const TOKEN_RADIUS: Record<SizeClass, number> = { S: 12, M: 16, L: 21 };
const STEP_MS = 180;

interface GameRendererProps {
  level: LevelData;
  sizeClass: SizeClass;
  tokenColor?: string;
}

/**
 * Owns the Excalibur engine for its lifetime and renders a server-persisted
 * level (floor/walls/objects layers + collision) with the player's token.
 * Click-to-move paths locally via the shared BFS; movement becomes a
 * server-validated intent when Rooms land (Phase 1) — the glide presentation
 * stays.
 */
export const GameRenderer = ({
  level,
  sizeClass,
  tokenColor = '#22d3ee',
}: GameRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // A fresh canvas per engine: Engine.dispose() detaches its canvas, which
    // under StrictMode's mount-unmount-mount would leave a parentless canvas
    // that FitContainer cannot size against.
    const canvas = document.createElement('canvas');
    canvas.className = 'h-full w-full';
    container.appendChild(canvas);

    const game = new ex.Engine({
      canvasElement: canvas,
      displayMode: ex.DisplayMode.FitContainer,
      pixelArt: true,
      backgroundColor: ex.Color.fromHex('#07070d'),
      suppressPlayButton: true,
    });

    const spriteSheet = ex.SpriteSheet.fromImageSource({
      image: tilesetImage,
      grid: {
        rows: ATLAS_ROWS,
        columns: ATLAS_COLUMNS,
        spriteWidth: TILE_SIZE,
        spriteHeight: TILE_SIZE,
      },
    });

    const spriteFor = (index: number): ex.Sprite | null => {
      if (index < 0 || index >= ATLAS_COLUMNS * ATLAS_ROWS) return null;
      return spriteSheet.getSprite(index % ATLAS_COLUMNS, Math.floor(index / ATLAS_COLUMNS));
    };

    const tileMap = new ex.TileMap({
      rows: level.height,
      columns: level.width,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = tileMap.getTile(x, y);
        if (!tile) continue;
        for (const layer of TILE_LAYERS) {
          const sprite = spriteFor(level.layers[layer][y][x]);
          if (sprite) tile.addGraphic(sprite);
        }
        if (level.collision[y][x] === 1) tile.solid = true;
      }
    }

    const cellCenter = (cell: { x: number; y: number }) =>
      ex.vec(cell.x * TILE_SIZE + TILE_SIZE / 2, cell.y * TILE_SIZE + TILE_SIZE / 2);

    const spawn = isWalkable(level, level.spawn)
      ? level.spawn
      : { x: 1, y: 1 };

    const token = new ex.Actor({
      pos: cellCenter(spawn),
      z: 10,
    });
    token.graphics.use(
      new ex.Circle({
        radius: TOKEN_RADIUS[sizeClass],
        color: ex.Color.fromHex(tokenColor),
        strokeColor: ex.Color.White,
        lineWidth: 2,
      }),
    );

    // Click-to-move: path from the cell under the token to the clicked cell.
    game.input.pointers.primary.on('up', (evt) => {
      const target = {
        x: Math.floor(evt.worldPos.x / TILE_SIZE),
        y: Math.floor(evt.worldPos.y / TILE_SIZE),
      };
      const from = {
        x: Math.floor(token.pos.x / TILE_SIZE),
        y: Math.floor(token.pos.y / TILE_SIZE),
      };
      const path = findPath(level, from, target);
      if (!path) return;

      token.actions.clearActions();
      // Re-center on the current cell first so a mid-glide click stays exact.
      token.actions.easeTo(cellCenter(from), STEP_MS / 2, ex.EasingFunctions.Linear);
      for (const step of path) {
        token.actions.easeTo(
          cellCenter(step),
          STEP_MS,
          ex.EasingFunctions.EaseInOutQuad,
        );
      }
    });

    const loader = new ex.Loader([tilesetImage]);
    loader.suppressPlayButton = true;

    let disposed = false;
    game
      .start(loader)
      .then(() => {
        if (disposed) return;
        game.currentScene.add(tileMap);
        game.currentScene.add(token);
        game.currentScene.camera.strategy.lockToActor(token);
        game.currentScene.camera.zoom = 1;
      })
      .catch((err) => console.error('Failed to start Excalibur engine', err));

    return () => {
      disposed = true;
      game.stop();
      game.dispose();
      canvas.remove();
    };
  }, [level, sizeClass, tokenColor]);

  return <div ref={containerRef} className="h-full w-full" />;
};
