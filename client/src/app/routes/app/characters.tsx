import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  ATTRIBUTE_POINT_BUDGET,
  RACES,
  getRace,
  type AttributeKey,
  type Attributes,
  type Character,
  type Gender,
  type SizeClass,
} from '@rpg/protocol';
import {
  applyRacialMods,
  deriveStats,
  pointsSpent,
  validateCreation,
} from '@rpg/world';

import { Head } from '@/components/seo';
import {
  gameApi,
  getActiveCharacterId,
  setActiveCharacterId,
} from '@/lib/game-api';
import { cn } from '@/utils/cn';

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  body: 'Body',
  agility: 'Agility',
  perception: 'Perception',
  logic: 'Logic',
};

const ATTRIBUTE_BLURBS: Record<AttributeKey, string> = {
  body: 'HP, carry capacity, resisting toxins, forcing things.',
  agility: 'Initiative, dodge, stealth, fine motor work.',
  perception: 'Recognition, hearing range, spotting, ambush awareness.',
  logic: 'Hacking, engineering, medicine, analysis.',
};

const startingAttributes = (): Attributes => ({
  body: 3,
  agility: 3,
  perception: 3,
  logic: 3,
});

export const CharactersRoute = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const characters = useQuery({
    queryKey: ['characters'],
    queryFn: gameApi.listCharacters,
  });

  const activeId = getActiveCharacterId();

  const select = (character: Character) => {
    setActiveCharacterId(character.id);
    navigate('/app/game');
  };

  return (
    <>
      <Head title="Characters" />
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.3em] text-cyan-300">
                Characters
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                One account, several lives. Pick who walks the sprawl tonight.
              </p>
            </div>
            {!creating && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="border border-cyan-500/70 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 hover:bg-cyan-500/25"
              >
                New character
              </button>
            )}
          </div>

          {creating ? (
            <CreationForm
              onDone={(character) => {
                setCreating(false);
                queryClient.invalidateQueries({ queryKey: ['characters'] });
                if (character) select(character);
              }}
            />
          ) : characters.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : characters.data && characters.data.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {characters.data.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  active={character.id === activeId}
                  onSelect={() => select(character)}
                />
              ))}
            </ul>
          ) : (
            <div className="border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
              No characters yet. The clone vats hum expectantly.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const CharacterCard = ({
  character,
  active,
  onSelect,
}: {
  character: Character;
  active: boolean;
  onSelect: () => void;
}) => {
  const race = getRace(character.raceId);
  const effective = applyRacialMods(character.attributes, character.raceId);
  const derived = deriveStats(effective);

  return (
    <li
      className={cn(
        'border bg-[#0b0b14] p-5',
        active ? 'border-cyan-500/70' : 'border-slate-800',
      )}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-slate-100">{character.name}</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Lv {character.level} · {race?.name ?? character.raceId} ·{' '}
          {character.sizeClass}
        </span>
      </div>

      <dl className="mb-4 grid grid-cols-4 gap-2 text-center">
        {ATTRIBUTE_KEYS.map((key) => (
          <div key={key} className="border border-slate-800 bg-black/40 py-2">
            <dt className="text-[10px] uppercase tracking-widest text-slate-500">
              {ATTRIBUTE_LABELS[key].slice(0, 4)}
            </dt>
            <dd className="text-lg font-bold text-cyan-300">
              {effective[key]}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mb-4 text-xs text-slate-500">
        HP {derived.maxHp} · Init {derived.initiative} · Carry{' '}
        {derived.carryCapacity} · Move {derived.moveBudget} ·{' '}
        <span className="text-amber-400/90">{character.credits} ¢</span>
      </p>

      <button
        type="button"
        onClick={onSelect}
        className="w-full border border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 hover:bg-cyan-500/25"
      >
        {active ? 'Continue' : 'Play'}
      </button>
    </li>
  );
};

const CreationForm = ({
  onDone,
}: {
  onDone: (created: Character | null) => void;
}) => {
  const [name, setName] = useState('');
  const [raceId, setRaceId] = useState('human');
  const [gender, setGender] = useState<Gender>('other');
  const [sizeClass, setSizeClass] = useState<SizeClass>('M');
  const [attributes, setAttributes] = useState<Attributes>(startingAttributes);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  const race = getRace(raceId)!;
  const spent = pointsSpent(attributes);
  const remaining = ATTRIBUTE_POINT_BUDGET - spent;
  const effective = useMemo(
    () => applyRacialMods(attributes, raceId),
    [attributes, raceId],
  );
  const derived = deriveStats(effective);

  const create = useMutation({
    mutationFn: gameApi.createCharacter,
    onSuccess: (character) => onDone(character),
    onError: (err: Error) => setError(err.message),
  });

  const pickRace = (id: string) => {
    setRaceId(id);
    const nextRace = getRace(id)!;
    if (!nextRace.sizeRange.includes(sizeClass)) {
      setSizeClass(nextRace.sizeRange[Math.floor(nextRace.sizeRange.length / 2)]);
    }
  };

  const adjust = (key: AttributeKey, delta: number) => {
    setAttributes((prev) => {
      const next = prev[key] + delta;
      if (next < ATTRIBUTE_MIN || next > ATTRIBUTE_MAX) return prev;
      if (delta > 0 && pointsSpent(prev) >= ATTRIBUTE_POINT_BUDGET) return prev;
      return { ...prev, [key]: next };
    });
  };

  const submit = () => {
    setError(null);
    const problems = validateCreation({ name, raceId, sizeClass, attributes });
    if (problems.length > 0) {
      setError(problems.join(' '));
      return;
    }
    create.mutate({
      name: name.trim(),
      raceId,
      gender,
      sizeClass,
      attributes,
      bio: bio.trim() || undefined,
    });
  };

  return (
    <div className="border border-slate-800 bg-[#0b0b14] p-6">
      <h2 className="mb-6 text-sm font-black uppercase tracking-[0.3em] text-fuchsia-400">
        Clone vat — new instantiation
      </h2>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* identity column */}
        <div className="space-y-5">
          <div>
            <label htmlFor="char-name" className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Character name
            </label>
            <input
              id="char-name"
              className="w-full border border-cyan-900/60 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Street name, legal name — your call"
            />
          </div>

          <div>
            <span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Race
            </span>
            <div className="grid grid-cols-1 gap-2">
              {RACES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickRace(r.id)}
                  className={cn(
                    'border px-3 py-2 text-left transition-colors',
                    raceId === r.id
                      ? 'border-cyan-500/70 bg-cyan-950/30'
                      : 'border-slate-800 hover:border-slate-600',
                  )}
                >
                  <span className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-100">
                      {r.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">
                      size {r.sizeRange.join('/')}
                      {Object.entries(r.attributeMods)
                        .map(
                          ([k, v]) =>
                            ` · ${k.slice(0, 3)} ${v > 0 ? '+' : ''}${v}`,
                        )
                        .join('')}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {r.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Gender
              </span>
              <div className="flex gap-1">
                {(['male', 'female', 'other'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={cn(
                      'flex-1 border px-2 py-1.5 text-xs uppercase tracking-wider',
                      gender === g
                        ? 'border-cyan-500/70 bg-cyan-950/30 text-cyan-300'
                        : 'border-slate-800 text-slate-500 hover:border-slate-600',
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Size class
              </span>
              <div className="flex gap-1">
                {(['S', 'M', 'L'] as SizeClass[]).map((s) => {
                  const allowed = race.sizeRange.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!allowed}
                      onClick={() => setSizeClass(s)}
                      className={cn(
                        'flex-1 border px-2 py-1.5 text-xs uppercase tracking-wider',
                        sizeClass === s && allowed
                          ? 'border-cyan-500/70 bg-cyan-950/30 text-cyan-300'
                          : 'border-slate-800 text-slate-500',
                        allowed
                          ? 'hover:border-slate-600'
                          : 'cursor-not-allowed opacity-30',
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="char-bio" className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Bio <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              id="char-bio"
              rows={3}
              className="w-full border border-cyan-900/60 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Who were they before tonight?"
            />
          </div>
        </div>

        {/* stats column */}
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Attributes — point buy
              </span>
              <span
                className={cn(
                  'text-xs font-bold',
                  remaining === 0 ? 'text-emerald-400' : 'text-amber-400',
                )}
              >
                {remaining} point{remaining === 1 ? '' : 's'} left
              </span>
            </div>

            <div className="space-y-2">
              {ATTRIBUTE_KEYS.map((key) => {
                const mod = race.attributeMods[key] ?? 0;
                return (
                  <div
                    key={key}
                    className="border border-slate-800 bg-black/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">
                        {ATTRIBUTE_LABELS[key]}
                        {mod !== 0 && (
                          <span
                            className={cn(
                              'ml-2 text-xs',
                              mod > 0 ? 'text-emerald-400' : 'text-rose-400',
                            )}
                          >
                            {mod > 0 ? '+' : ''}
                            {mod} racial
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <StepButton
                          label="-"
                          onClick={() => adjust(key, -1)}
                          disabled={attributes[key] <= ATTRIBUTE_MIN}
                        />
                        <span className="w-10 text-center text-lg font-bold text-cyan-300">
                          {attributes[key]}
                          {mod !== 0 && (
                            <span className="text-xs text-slate-500">
                              →{effective[key]}
                            </span>
                          )}
                        </span>
                        <StepButton
                          label="+"
                          onClick={() => adjust(key, 1)}
                          disabled={
                            attributes[key] >= ATTRIBUTE_MAX || remaining <= 0
                          }
                        />
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {ATTRIBUTE_BLURBS[key]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-slate-800 bg-black/40 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Derived
            </span>
            <p className="mt-1 text-sm text-slate-300">
              HP <b className="text-cyan-300">{derived.maxHp}</b> · Initiative{' '}
              <b className="text-cyan-300">{derived.initiative}</b> · Carry{' '}
              <b className="text-cyan-300">{derived.carryCapacity}</b> · Move{' '}
              <b className="text-cyan-300">{derived.moveBudget}</b>
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              3 random traits are drawn here once the trait pool ships (Phase
              5).
            </p>
          </div>

          {error && (
            <p className="border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || remaining !== 0}
              className="flex-1 border border-cyan-500/70 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {create.isPending ? 'Decanting…' : 'Instantiate'}
            </button>
            <button
              type="button"
              onClick={() => onDone(null)}
              className="border border-slate-700 px-4 py-2.5 text-sm uppercase tracking-[0.25em] text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepButton = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="size-7 border border-slate-700 text-sm font-bold text-slate-300 hover:border-cyan-500/70 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
  >
    {label}
  </button>
);
