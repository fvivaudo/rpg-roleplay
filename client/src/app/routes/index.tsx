import { QueryClient } from '@tanstack/react-query';
import { createBrowserRouter } from 'react-router';
import {ConnectRedirectRoute, ProtectedRoute, useUser} from "@/lib/auth.tsx";

// import { ProtectedRoute } from '@/lib/auth';
//
// import { discussionLoader } from './app/discussions/discussion';
// import { discussionsLoader } from './app/discussions/discussions';
import { AppRoot } from './app/root';
import {LandingRoute} from "@/app/routes/landing.tsx";
// import { usersLoader } from './app/users';

export const createRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: '/',
        element: (
            <ConnectRedirectRoute>
                <LandingRoute />
            </ConnectRedirectRoute>
        ),
    },

    // {
    //   path: '/auth/register',
    //   lazy: async () => {
    //     const { RegisterRoute } = await import('./auth/register');
    //     return { Component: RegisterRoute };
    //   },
    // },
    // {
    //   path: '/auth/login',
    //   lazy: async () => {
    //     const { LoginRoute } = await import('./auth/login');
    //     return { Component: LoginRoute };
    //   },
    // },
    {
      path: '/app',
      element: (
        <ProtectedRoute>
          <AppRoot />
        </ProtectedRoute>
      ),
      children: [
        {
          path: 'game',
          lazy: async () => {
            const { GameRoute } = await import('./app/gameScreen.tsx');
            return { Component: GameRoute };
          },
        },
        // {
        //   path: 'discussions',
        //   lazy: async () => {
        //     const { DiscussionsRoute } = await import(
        //       './app/discussions/discussions'
        //     );
        //     return { Component: DiscussionsRoute };
        //   },
        //   loader: discussionsLoader(queryClient),
        // },
        // {
        //   path: 'discussions/:discussionId',
        //   lazy: async () => {
        //     const { DiscussionRoute } = await import(
        //       './app/discussions/discussion'
        //     );
        //     return { Component: DiscussionRoute };
        //   },
        //   loader: discussionLoader(queryClient),
        // },
        // {
        //   path: 'users',
        //   lazy: async () => {
        //     const { UsersRoute } = await import('./app/users');
        //     return { Component: UsersRoute };
        //   },
        //   loader: usersLoader(queryClient),
        // },
        // {
        //   path: 'profile',
        //   lazy: async () => {
        //     const { ProfileRoute } = await import('./app/profile');
        //     return { Component: ProfileRoute };
        //   },
        // },
        // {
        //   path: '',
        //   lazy: async () => {
        //     const { DashboardRoute } = await import('./app/dashboard');
        //     return { Component: DashboardRoute };
        //   },
        // },
      ],
    },
    {
      path: '*',
      lazy: async () => {
        const { NotFoundRoute } = await import('./not-found');
        return { Component: NotFoundRoute };
      },
    },
  ], {
      future: {
          v7_fetcherPersist: true,
          v7_normalizeFormMethod: true,
      },
  });
