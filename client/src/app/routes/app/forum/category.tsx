import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { Head } from '@/components/seo';
import { gameApi } from '@/lib/game-api';

import { ForumShell, formatDate } from './shared';

export const ForumCategoryRoute = () => {
  const params = useParams();
  const categoryId = Number(params.categoryId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listing = useQuery({
    queryKey: ['forum', 'category', categoryId],
    queryFn: () => gameApi.categoryThreads(categoryId),
    enabled: Number.isFinite(categoryId),
  });

  const createThread = useMutation({
    mutationFn: () => gameApi.createThread(categoryId, { title, content }),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['forum'] });
      navigate(`/app/forum/thread/${thread.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!Number.isFinite(categoryId)) {
    return <ForumShell>Bad category.</ForumShell>;
  }

  return (
    <>
      <Head title={listing.data?.category.name ?? 'Forum'} />
      <ForumShell
        breadcrumb={[{ label: listing.data?.category.name ?? '…' }]}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {listing.data?.category.description}
          </p>
          {!composing && (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="border border-cyan-500/70 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 hover:bg-cyan-500/25"
            >
              New thread
            </button>
          )}
        </div>

        {composing && (
          <div className="mb-6 space-y-3 border border-slate-800 bg-[#0b0b14] p-5">
            <input
              className="w-full border border-cyan-900/60 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
              placeholder="Thread title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
            />
            <textarea
              rows={5}
              className="w-full border border-cyan-900/60 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
              placeholder="Opening post"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {error && (
              <p className="border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  createThread.isPending ||
                  title.trim().length < 3 ||
                  content.trim().length === 0
                }
                onClick={() => {
                  setError(null);
                  createThread.mutate();
                }}
                className="border border-cyan-500/70 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-40"
              >
                {createThread.isPending ? 'Posting…' : 'Post thread'}
              </button>
              <button
                type="button"
                onClick={() => setComposing(false)}
                className="px-3 py-2 text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {listing.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : listing.data && listing.data.threads.length > 0 ? (
          <ul className="space-y-2">
            {listing.data.threads.map((thread) => (
              <li key={thread.id}>
                <Link
                  to={`/app/forum/thread/${thread.id}`}
                  className="flex items-center justify-between gap-4 border border-slate-800 bg-[#0b0b14] px-5 py-3 transition-colors hover:border-cyan-500/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-100">
                      {thread.title}
                    </span>
                    <span className="block text-xs text-slate-500">
                      by <span className="text-fuchsia-300">{thread.authorName}</span>{' '}
                      · {formatDate(thread.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-slate-500">
                    <span className="block text-slate-300">
                      {thread.postCount} post{thread.postCount === 1 ? '' : 's'}
                    </span>
                    <span className="block">
                      last {formatDate(thread.lastPostAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
            No threads yet. Static on the wire.
          </div>
        )}
      </ForumShell>
    </>
  );
};
