import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  type LevelData,
  type MapKind,
  type TileLayerName,
} from '@rpg/protocol';

import { Head } from '@/components/seo';
import { gameApi } from '@/lib/game-api';
import { cn } from '@/utils/cn';

const TILESET_URL = '/game/tileset.png';
const TILE_COUNT = ATLAS_COLUMNS * ATLAS_ROWS;

type EditorLayer = TileLayerName | 'collision' | 'spawn';
type Tool = 'paint' | 'erase' | 'fill' | 'picker';

const LAYER_OPTIONS: { id: EditorLayer; label: string }[] = [
  { id: 'floor', label: 'Floor' },
  { id: 'walls', label: 'Walls' },
  { id: 'objects', label: 'Objects' },
  { id: 'collision', label: 'Collision' },
  { id: 'spawn', label: 'Spawn' },
];

const TOOL_OPTIONS: { id: Tool; label: string; hint: string }[] = [
  { id: 'paint', label: 'Paint', hint: 'drag to draw' },
  { id: 'erase', label: 'Erase', hint: 'drag to clear' },
  { id: 'fill', label: 'Fill', hint: 'flood-fill region' },
  { id: 'picker', label: 'Pick', hint: 'grab a tile from the map' },
];

const clone = (level: LevelData): LevelData =>
  JSON.parse(JSON.stringify(level));

/**
 * GM map editor (seed of DESIGN.md Part X, Tier 1). Edits the level grid in
 * the DOM — tile layers, collision paint, spawn — and saves through the
 * version-bump + revision pipeline. Saving requires the Admin role (the
 * server rejects other accounts with a 403 surfaced in the status bar).
 */
export const EditorRoute = () => {
  const queryClient = useQueryClient();

  const maps = useQuery({ queryKey: ['maps'], queryFn: gameApi.listMaps });
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const mapId = selectedMapId ?? maps.data?.[0]?.id ?? null;

  const map = useQuery({
    queryKey: ['map', mapId],
    queryFn: () => gameApi.getMap(mapId!),
    enabled: !!mapId,
  });

  const level = map.data?.levels[0] ?? null;

  const [draft, setDraft] = useState<LevelData | null>(null);
  const [loadedLevelKey, setLoadedLevelKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [activeLayer, setActiveLayer] = useState<EditorLayer>('floor');
  const [tool, setTool] = useState<Tool>('paint');
  const [selectedTile, setSelectedTile] = useState(0);
  const [cellSize, setCellSize] = useState(32);
  const [showCollision, setShowCollision] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [showNewMap, setShowNewMap] = useState(false);

  const undoStack = useRef<LevelData[]>([]);
  const painting = useRef(false);

  // Load the fetched level into the local draft when switching maps or after
  // a save bumped the version (never mid-edit: dirty drafts win).
  const levelKey = level ? `${level.id}:${level.version}` : null;
  useEffect(() => {
    if (level && levelKey !== loadedLevelKey && !dirty) {
      setDraft(clone(level.data));
      setLoadedLevelKey(levelKey);
      undoStack.current = [];
    }
  }, [level, levelKey, loadedLevelKey, dirty]);

  const save = useMutation({
    mutationFn: () => gameApi.saveLevel(level!.id, draft!),
    onSuccess: (saved) => {
      setDirty(false);
      setLoadedLevelKey(`${saved.id}:${saved.version}`);
      setStatus(`Saved — now v${saved.version}`);
      queryClient.invalidateQueries({ queryKey: ['map', mapId] });
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
    onError: (err: Error) => setStatus(`Save failed: ${err.message}`),
  });

  const createMap = useMutation({
    mutationFn: gameApi.createMap,
    onSuccess: (created) => {
      setShowNewMap(false);
      setDirty(false);
      setSelectedMapId(created.id);
      queryClient.invalidateQueries({ queryKey: ['maps'] });
      setStatus(`Created "${created.name}"`);
    },
    onError: (err: Error) => setStatus(`Create failed: ${err.message}`),
  });

  const pushUndo = useCallback(() => {
    if (!draft) return;
    undoStack.current.push(clone(draft));
    if (undoStack.current.length > 30) undoStack.current.shift();
  }, [draft]);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (previous) {
      setDraft(previous);
      setDirty(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  const applyAt = useCallback(
    (x: number, y: number, withUndo: boolean) => {
      if (!draft) return;
      if (x < 0 || x >= draft.width || y < 0 || y >= draft.height) return;

      if (tool === 'picker') {
        if (activeLayer !== 'collision' && activeLayer !== 'spawn') {
          const value = draft.layers[activeLayer][y][x];
          if (value >= 0) setSelectedTile(value);
          setTool('paint');
        }
        return;
      }

      if (withUndo) pushUndo();

      setDraft((prev) => {
        if (!prev) return prev;
        const next = clone(prev);

        if (activeLayer === 'spawn') {
          if (next.collision[y][x] !== 1) next.spawn = { x, y };
          return next;
        }

        if (activeLayer === 'collision') {
          const value = tool === 'erase' ? 0 : 1;
          if (tool === 'fill') {
            floodFill(next.collision, x, y, value);
          } else {
            next.collision[y][x] = value;
          }
          return next;
        }

        const grid = next.layers[activeLayer];
        const value = tool === 'erase' ? -1 : selectedTile;
        if (tool === 'fill') {
          floodFill(grid, x, y, value);
        } else {
          grid[y][x] = value;
          // Painting a wall blocks the cell; erasing one frees it. Collision
          // stays hand-editable on its own layer for overrides.
          if (activeLayer === 'walls') {
            next.collision[y][x] = value >= 0 ? 1 : 0;
          }
        }
        return next;
      });
      setDirty(true);
    },
    [draft, tool, activeLayer, selectedTile, pushUndo],
  );

  const cellFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor((event.clientX - rect.left) / cellSize),
      y: Math.floor((event.clientY - rect.top) / cellSize),
    };
  };

  if (maps.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.3em] text-slate-500">
        Loading maps…
      </div>
    );
  }

  return (
    <>
      <Head title="Map editor" />
      <div className="flex h-full">
        {/* left rail: palette */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-cyan-900/50 bg-[#0b0b14]">
          <div className="border-b border-slate-800 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Tileset
            </p>
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: `repeat(${ATLAS_COLUMNS}, 1fr)`,
              }}
            >
              {Array.from({ length: TILE_COUNT }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setSelectedTile(index);
                    if (tool === 'erase') setTool('paint');
                    if (activeLayer === 'collision' || activeLayer === 'spawn') {
                      setActiveLayer('floor');
                    }
                  }}
                  className={cn(
                    'aspect-square w-full',
                    selectedTile === index &&
                      'outline outline-2 outline-cyan-400',
                  )}
                  style={tileBackground(index)}
                  title={`Tile ${index}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 p-3">
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Layer
              </p>
              <div className="flex flex-wrap gap-1">
                {LAYER_OPTIONS.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayer(layer.id)}
                    className={cn(
                      'border px-2.5 py-1 text-[11px] uppercase tracking-wider',
                      activeLayer === layer.id
                        ? 'border-cyan-500/70 bg-cyan-950/40 text-cyan-300'
                        : 'border-slate-800 text-slate-500 hover:border-slate-600',
                    )}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Tool
              </p>
              <div className="flex flex-wrap gap-1">
                {TOOL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTool(option.id)}
                    title={option.hint}
                    className={cn(
                      'border px-2.5 py-1 text-[11px] uppercase tracking-wider',
                      tool === option.id
                        ? 'border-fuchsia-500/70 bg-fuchsia-950/40 text-fuchsia-300'
                        : 'border-slate-800 text-slate-500 hover:border-slate-600',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                <input
                  type="checkbox"
                  checked={showCollision}
                  onChange={(e) => setShowCollision(e.target.checked)}
                  className="accent-rose-500"
                />
                Collision overlay
              </label>
              <div className="flex gap-1">
                {[24, 32, 48].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCellSize(size)}
                    className={cn(
                      'border px-2 py-0.5 text-[11px]',
                      cellSize === size
                        ? 'border-cyan-500/70 text-cyan-300'
                        : 'border-slate-800 text-slate-500',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={undo}
              className="w-full border border-slate-700 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
            >
              Undo (Ctrl+Z)
            </button>
          </div>
        </aside>

        {/* main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-cyan-900/50 bg-[#0b0b14] px-4 py-2">
            <select
              value={mapId ?? ''}
              onChange={(e) => {
                setSelectedMapId(e.target.value);
                setDirty(false);
                setLoadedLevelKey(null);
              }}
              className="border border-slate-700 bg-black/60 px-2 py-1.5 text-xs text-slate-200 outline-none"
            >
              {maps.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.kind.toLowerCase()})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewMap((value) => !value)}
              className="border border-slate-700 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
            >
              New map
            </button>

            <div className="ml-auto flex items-center gap-3">
              {level && (
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                  {level.name} · v{level.version}
                  {dirty && <span className="text-amber-400"> · unsaved</span>}
                </span>
              )}
              <button
                type="button"
                disabled={!dirty || save.isPending || !level || !draft}
                onClick={() => save.mutate()}
                className="border border-cyan-500/70 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {status && (
            <p className="border-b border-slate-800 bg-black/40 px-4 py-1 text-[11px] text-slate-500">
              {status}
            </p>
          )}

          {showNewMap && (
            <NewMapForm
              pending={createMap.isPending}
              onCreate={(input) => createMap.mutate(input)}
              onCancel={() => setShowNewMap(false)}
            />
          )}

          <div className="min-h-0 flex-1 overflow-auto bg-[#07070d] p-6">
            {draft ? (
              <div
                className="relative select-none touch-none"
                style={{
                  width: draft.width * cellSize,
                  height: draft.height * cellSize,
                  backgroundColor: '#0d0d18',
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  painting.current = true;
                  const cell = cellFromEvent(event);
                  applyAt(cell.x, cell.y, true);
                }}
                onPointerMove={(event) => {
                  if (!painting.current || tool === 'fill' || tool === 'picker')
                    return;
                  const cell = cellFromEvent(event);
                  applyAt(cell.x, cell.y, false);
                }}
                onPointerUp={() => {
                  painting.current = false;
                }}
              >
                {draft.layers.floor.map((row, y) =>
                  row.map((_, x) => (
                    <EditorCell
                      key={`${x}:${y}`}
                      draft={draft}
                      x={x}
                      y={y}
                      size={cellSize}
                      showCollision={showCollision}
                    />
                  )),
                )}

                {/* spawn marker */}
                <div
                  className="pointer-events-none absolute flex items-center justify-center text-[10px] font-black text-emerald-300"
                  style={{
                    left: draft.spawn.x * cellSize,
                    top: draft.spawn.y * cellSize,
                    width: cellSize,
                    height: cellSize,
                    border: '2px solid rgba(52,211,153,0.9)',
                    textShadow: '0 0 6px black',
                  }}
                >
                  S
                </div>
              </div>
            ) : (
              <p className="text-sm uppercase tracking-[0.3em] text-slate-600">
                {map.isLoading ? 'Loading level…' : 'No map selected.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/** Layered tile visual: objects over walls over floor via CSS multi-background. */
const EditorCell = ({
  draft,
  x,
  y,
  size,
  showCollision,
}: {
  draft: LevelData;
  x: number;
  y: number;
  size: number;
  showCollision: boolean;
}) => {
  const images: string[] = [];
  const positions: string[] = [];
  const sizes: string[] = [];

  if (showCollision && draft.collision[y][x] === 1) {
    images.push(
      'linear-gradient(rgba(244,63,94,0.4), rgba(244,63,94,0.4))',
    );
    positions.push('0 0');
    sizes.push('100% 100%');
  }

  for (const layer of ['objects', 'walls', 'floor'] as TileLayerName[]) {
    const index = draft.layers[layer][y][x];
    if (index < 0) continue;
    const col = index % ATLAS_COLUMNS;
    const row = Math.floor(index / ATLAS_COLUMNS);
    images.push(`url(${TILESET_URL})`);
    positions.push(`-${col * size}px -${row * size}px`);
    sizes.push(`${ATLAS_COLUMNS * size}px ${ATLAS_ROWS * size}px`);
  }

  return (
    <div
      className="absolute"
      style={{
        left: x * size,
        top: y * size,
        width: size,
        height: size,
        backgroundImage: images.length ? images.join(', ') : undefined,
        backgroundPosition: positions.join(', '),
        backgroundSize: sizes.join(', '),
        backgroundRepeat: 'no-repeat',
        boxShadow: 'inset 0 0 0 0.5px rgba(148,163,184,0.08)',
        imageRendering: 'pixelated',
      }}
    />
  );
};

const NewMapForm = ({
  pending,
  onCreate,
  onCancel,
}: {
  pending: boolean;
  onCreate: (input: {
    name: string;
    kind: MapKind;
    width: number;
    height: number;
  }) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<MapKind>('EXTERIOR');
  const [width, setWidth] = useState(24);
  const [height, setHeight] = useState(16);

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-800 bg-black/40 px-4 py-3">
      <label className="text-[11px] uppercase tracking-wider text-slate-500">
        Name
        <input
          className="mt-1 block w-48 border border-slate-700 bg-black/60 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rust Quarter"
        />
      </label>
      <label className="text-[11px] uppercase tracking-wider text-slate-500">
        Kind
        <select
          className="mt-1 block border border-slate-700 bg-black/60 px-2 py-1.5 text-xs text-slate-200 outline-none"
          value={kind}
          onChange={(e) => setKind(e.target.value as MapKind)}
        >
          <option value="EXTERIOR">Exterior</option>
          <option value="BUILDING">Building</option>
          <option value="TRANSPORT">Transport</option>
          <option value="LIMBO">Limbo</option>
        </select>
      </label>
      {(
        [
          ['Width', width, setWidth],
          ['Height', height, setHeight],
        ] as const
      ).map(([label, value, setter]) => (
        <label
          key={label}
          className="text-[11px] uppercase tracking-wider text-slate-500"
        >
          {label}
          <input
            type="number"
            min={2}
            max={200}
            className="mt-1 block w-20 border border-slate-700 bg-black/60 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
            value={value}
            onChange={(e) => setter(Number(e.target.value))}
          />
        </label>
      ))}
      <button
        type="button"
        disabled={pending || name.trim().length === 0}
        onClick={() =>
          onCreate({ name: name.trim(), kind, width, height })
        }
        className="border border-cyan-500/70 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-40"
      >
        {pending ? 'Creating…' : 'Create'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300"
      >
        Cancel
      </button>
    </div>
  );
};

/** Percentage-based so the tile scales with whatever size the button renders at. */
function tileBackground(index: number): React.CSSProperties {
  const col = index % ATLAS_COLUMNS;
  const row = Math.floor(index / ATLAS_COLUMNS);
  return {
    backgroundImage: `url(${TILESET_URL})`,
    backgroundPosition: `${(col / (ATLAS_COLUMNS - 1)) * 100}% ${(row / (ATLAS_ROWS - 1)) * 100}%`,
    backgroundSize: `${ATLAS_COLUMNS * 100}% ${ATLAS_ROWS * 100}%`,
    imageRendering: 'pixelated',
  };
}

/** 4-connected flood fill, in place. */
function floodFill(grid: number[][], x: number, y: number, value: number) {
  const height = grid.length;
  const width = grid[0].length;
  const target = grid[y][x];
  if (target === value) return;

  const stack: [number, number][] = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    if (grid[cy][cx] !== target) continue;
    grid[cy][cx] = value;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}
