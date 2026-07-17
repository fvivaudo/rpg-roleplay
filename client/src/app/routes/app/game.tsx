import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router';

import { ATTRIBUTE_KEYS, getRace, type AttributeKey } from '@rpg/protocol';
import { applyRacialMods, deriveStats } from '@rpg/world';

import { GameRenderer } from '@/components/game/GameRenderer';
import { Head } from '@/components/seo';
import { gameApi, getActiveCharacterId } from '@/lib/game-api';
import { cn } from '@/utils/cn';

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  body: 'Body',
  agility: 'Agility',
  perception: 'Perception',
  logic: 'Logic',
};

export const GameRoute = () => {
  const [sheetOpen, setSheetOpen] = useState(false);

  const characters = useQuery({
    queryKey: ['characters'],
    queryFn: gameApi.listCharacters,
  });

  const maps = useQuery({ queryKey: ['maps'], queryFn: gameApi.listMaps });

  // V0: everyone plays on the first (seeded) map. Position persistence and
  // multi-map travel arrive with Rooms in Phase 1.
  const mapId = maps.data?.[0]?.id;
  const map = useQuery({
    queryKey: ['map', mapId],
    queryFn: () => gameApi.getMap(mapId!),
    enabled: !!mapId,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'c' && !isTyping(event)) {
        setSheetOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeId = getActiveCharacterId();
  const character = useMemo(
    () => characters.data?.find((c) => c.id === activeId) ?? null,
    [characters.data, activeId],
  );

  // Only bounce once the list is settled: right after creation the cached
  // (stale) list doesn't contain the new character yet while it refetches.
  if (characters.isSuccess && !characters.isFetching && !character) {
    return <Navigate to="/app/characters" replace />;
  }

  if (!character || !map.data) {
    return (
      <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.3em] text-slate-500">
        {maps.isError || map.isError || characters.isError
          ? 'Connection to the grid failed.'
          : 'Loading the grid…'}
      </div>
    );
  }

  const level = map.data.levels[0];
  const race = getRace(character.raceId);
  const effective = applyRacialMods(character.attributes, character.raceId);
  const derived = deriveStats(effective);

  return (
    <>
      <Head title="Game" />
      <div className="relative h-full w-full overflow-hidden">
        <GameRenderer level={level.data} sizeClass={character.sizeClass} />

        {/* top status cluster */}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3 border border-cyan-900/50 bg-[#0b0b14]/85 px-4 py-2">
          <div>
            <p className="text-sm font-bold text-cyan-300">{character.name}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {race?.name} · {character.sizeClass} · Lv {character.level} ·{' '}
              <span className="text-amber-400/90">{character.credits} ¢</span>
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 border border-cyan-900/50 bg-[#0b0b14]/85 px-4 py-2 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            {map.data.name}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600">
            {level.name} · v{level.version}
          </p>
        </div>

        {/* bottom hint bar */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 border border-slate-800 bg-[#0b0b14]/85 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          Click to move · C — character sheet
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          className={cn(
            'absolute bottom-4 right-4 border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em]',
            sheetOpen
              ? 'border-cyan-500/70 bg-cyan-950/60 text-cyan-300'
              : 'border-slate-700 bg-[#0b0b14]/85 text-slate-400 hover:text-slate-200',
          )}
        >
          Sheet
        </button>

        {/* character sheet */}
        {sheetOpen && (
          <aside className="absolute right-4 top-20 w-72 border border-cyan-900/60 bg-[#0b0b14]/95 p-5 shadow-[0_0_40px_rgba(34,211,238,0.1)]">
            <header className="mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                {character.name}
              </h2>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                {race?.name} · {character.gender} · size {character.sizeClass}
              </p>
            </header>

            <dl className="mb-4 space-y-2">
              {ATTRIBUTE_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {ATTRIBUTE_LABELS[key]}
                  </dt>
                  <dd className="flex items-center gap-2">
                    <span className="h-1.5 w-24 bg-slate-800">
                      <span
                        className="block h-full bg-cyan-500/70"
                        style={{
                          width: `${Math.min(100, (effective[key] / 7) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="w-5 text-right text-sm font-bold text-cyan-300">
                      {effective[key]}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mb-4 grid grid-cols-2 gap-2 text-center">
              <SheetStat label="HP" value={`${derived.maxHp}`} />
              <SheetStat label="Initiative" value={`${derived.initiative}`} />
              <SheetStat label="Carry" value={`${derived.carryCapacity}`} />
              <SheetStat label="Move" value={`${derived.moveBudget}`} />
            </div>

            <div className="space-y-1 text-[11px] text-slate-500">
              <p>
                XP {character.xp} · Level {character.level}
              </p>
              <p className="text-amber-400/90">{character.credits} credits</p>
              {character.bio && (
                <p className="border-t border-slate-800 pt-2 italic text-slate-400">
                  {character.bio}
                </p>
              )}
              <p className="border-t border-slate-800 pt-2 text-slate-600">
                Traits are private — yours will appear here once the trait pool
                ships.
              </p>
            </div>
          </aside>
        )}
      </div>
    </>
  );
};

const SheetStat = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-slate-800 bg-black/40 py-2">
    <p className="text-[10px] uppercase tracking-widest text-slate-500">
      {label}
    </p>
    <p className="text-lg font-bold text-cyan-300">{value}</p>
  </div>
);

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return (
    !!target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  );
}
