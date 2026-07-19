// Typed fetch client for the V0 game/forum REST surface. The auth feature
// still rides Eden treaty (api-client.ts); these endpoints use a plain fetch
// wrapper so adding a route stays a one-liner while the API is in flux.

import type {
  Attributes,
  Character,
  ForumCategory,
  ForumPost,
  ForumThreadSummary,
  Gender,
  LevelData,
  MapKind,
  MapLevelDTO,
  MapSummary,
  MapWithLevels,
  SizeClass,
} from '@rpg/protocol';

const BASE_URL = 'http://localhost:3000';

async function http<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (typeof payload?.message === 'string') message = payload.message;
    } catch {
      // non-JSON error body; keep the status message
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export interface CreateCharacterInput {
  name: string;
  raceId: string;
  gender: Gender;
  sizeClass: SizeClass;
  attributes: Attributes;
  bio?: string;
}

export interface ThreadListing {
  category: { id: number; name: string; description: string };
  threads: ForumThreadSummary[];
}

export interface ThreadDetail {
  thread: { id: number; categoryId: number; title: string; createdAt: string };
  posts: ForumPost[];
}

export const gameApi = {
  // --- characters ---
  listCharacters: () =>
    http<{ data: { characters: Character[] } }>('/characters').then(
      (r) => r.data.characters,
    ),
  createCharacter: (input: CreateCharacterInput) =>
    http<{ data: { character: Character } }>('/characters', {
      method: 'POST',
      body: input,
    }).then((r) => r.data.character),

  // --- maps ---
  listMaps: () =>
    http<{ data: { maps: MapSummary[] } }>('/maps').then((r) => r.data.maps),
  getMap: (id: string) =>
    http<{ data: { map: MapWithLevels } }>(`/maps/${id}`).then(
      (r) => r.data.map,
    ),
  createMap: (input: {
    name: string;
    kind: MapKind;
    width: number;
    height: number;
  }) =>
    http<{ data: { map: MapWithLevels } }>('/maps', {
      method: 'POST',
      body: input,
    }).then((r) => r.data.map),
  saveLevel: (levelId: string, data: LevelData) =>
    http<{ data: { level: MapLevelDTO } }>(`/maps/levels/${levelId}`, {
      method: 'PUT',
      body: { data },
    }).then((r) => r.data.level),

  // --- forum ---
  forumCategories: () =>
    http<{ data: { categories: ForumCategory[] } }>('/forum/categories').then(
      (r) => r.data.categories,
    ),
  categoryThreads: (categoryId: number) =>
    http<{ data: ThreadListing }>(`/forum/categories/${categoryId}/threads`).then(
      (r) => r.data,
    ),
  createThread: (categoryId: number, input: { title: string; content: string }) =>
    http<{ data: { thread: { id: number } } }>(
      `/forum/categories/${categoryId}/threads`,
      { method: 'POST', body: input },
    ).then((r) => r.data.thread),
  getThread: (threadId: number) =>
    http<{ data: ThreadDetail }>(`/forum/threads/${threadId}`).then(
      (r) => r.data,
    ),
  createPost: (threadId: number, content: string) =>
    http<{ data: { post: ForumPost } }>(`/forum/threads/${threadId}/posts`, {
      method: 'POST',
      body: { content },
    }).then((r) => r.data.post),
};

// --- active character selection (client-side for V0) -------------------------

const ACTIVE_CHARACTER_KEY = 'nekron.activeCharacterId';

export const getActiveCharacterId = (): string | null =>
  localStorage.getItem(ACTIVE_CHARACTER_KEY);

export const setActiveCharacterId = (id: string) =>
  localStorage.setItem(ACTIVE_CHARACTER_KEY, id);

export const clearActiveCharacterId = () =>
  localStorage.removeItem(ACTIVE_CHARACTER_KEY);
