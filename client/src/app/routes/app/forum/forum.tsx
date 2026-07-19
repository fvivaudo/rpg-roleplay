import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { Head } from '@/components/seo';
import { gameApi } from '@/lib/game-api';

import { ForumShell } from './shared';

export const ForumRoute = () => {
  const categories = useQuery({
    queryKey: ['forum', 'categories'],
    queryFn: gameApi.forumCategories,
  });

  return (
    <>
      <Head title="Forum" />
      <ForumShell>
        {categories.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : categories.isError ? (
          <p className="text-sm text-rose-400">Could not reach the board.</p>
        ) : (
          <ul className="space-y-3">
            {categories.data!.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/app/forum/${category.id}`}
                  className="flex items-center justify-between border border-slate-800 bg-[#0b0b14] px-5 py-4 transition-colors hover:border-cyan-500/60"
                >
                  <span>
                    <span className="block text-base font-bold text-slate-100">
                      {category.name}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {category.description}
                    </span>
                  </span>
                  <span className="shrink-0 border border-slate-800 bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {category.threadCount} thread
                    {category.threadCount === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ForumShell>
    </>
  );
};
