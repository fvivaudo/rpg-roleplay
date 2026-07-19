import { QueryClient } from '@tanstack/react-query';
import { createBrowserRouter, Navigate } from 'react-router';

import { ConnectRedirectRoute, ProtectedRoute } from '@/lib/auth.tsx';

import { AppRoot } from './app/root';
import { LandingRoute } from '@/app/routes/landing.tsx';

export const createRouter = (_queryClient: QueryClient) =>
  createBrowserRouter(
    [
      {
        path: '/',
        element: (
          <ConnectRedirectRoute>
            <LandingRoute />
          </ConnectRedirectRoute>
        ),
      },
      {
        path: '/app',
        element: (
          <ProtectedRoute>
            <AppRoot />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="game" replace /> },
          {
            path: 'game',
            lazy: async () => {
              const { GameRoute } = await import('./app/game');
              return { Component: GameRoute };
            },
          },
          {
            path: 'characters',
            lazy: async () => {
              const { CharactersRoute } = await import('./app/characters');
              return { Component: CharactersRoute };
            },
          },
          {
            path: 'editor',
            lazy: async () => {
              const { EditorRoute } = await import('./app/editor');
              return { Component: EditorRoute };
            },
          },
          {
            path: 'forum',
            lazy: async () => {
              const { ForumRoute } = await import('./app/forum/forum');
              return { Component: ForumRoute };
            },
          },
          {
            path: 'forum/:categoryId',
            lazy: async () => {
              const { ForumCategoryRoute } = await import('./app/forum/category');
              return { Component: ForumCategoryRoute };
            },
          },
          {
            path: 'forum/thread/:threadId',
            lazy: async () => {
              const { ForumThreadRoute } = await import('./app/forum/thread');
              return { Component: ForumThreadRoute };
            },
          },
        ],
      },
      {
        path: '*',
        lazy: async () => {
          const { NotFoundRoute } = await import('./not-found');
          return { Component: NotFoundRoute };
        },
      },
    ],
    {
      future: {
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
      },
    },
  );
