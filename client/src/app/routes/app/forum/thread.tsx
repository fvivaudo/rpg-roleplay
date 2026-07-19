import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { Head } from '@/components/seo';
import { gameApi } from '@/lib/game-api';

import { ForumShell, formatDate } from './shared';

export const ForumThreadRoute = () => {
  const params = useParams();
  const threadId = Number(params.threadId);
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['forum', 'thread', threadId],
    queryFn: () => gameApi.getThread(threadId),
    enabled: Number.isFinite(threadId),
  });

  const post = useMutation({
    mutationFn: () => gameApi.createPost(threadId, reply.trim()),
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['forum'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!Number.isFinite(threadId)) {
    return <ForumShell>Bad thread.</ForumShell>;
  }

  return (
    <>
      <Head title={detail.data?.thread.title ?? 'Thread'} />
      <ForumShell
        breadcrumb={[
          {
            label: 'Category',
            to: detail.data
              ? `/app/forum/${detail.data.thread.categoryId}`
              : undefined,
          },
          { label: detail.data?.thread.title ?? '…' },
        ]}
      >
        {detail.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : detail.isError ? (
          <p className="text-sm text-rose-400">Thread not found.</p>
        ) : (
          <>
            <h2 className="mb-6 text-xl font-bold text-slate-100">
              {detail.data!.thread.title}
            </h2>

            <ol className="mb-8 space-y-3">
              {detail.data!.posts.map((item, index) => (
                <li
                  key={item.id}
                  className="border border-slate-800 bg-[#0b0b14]"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-2">
                    <span className="text-sm font-semibold text-fuchsia-300">
                      {item.authorName}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                      #{index + 1} · {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-slate-300">
                    {item.content}
                  </p>
                </li>
              ))}
            </ol>

            <div className="space-y-3 border border-slate-800 bg-[#0b0b14] p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Reply
              </p>
              <textarea
                rows={4}
                className="w-full border border-cyan-900/60 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
                placeholder="Patch into the thread…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              {error && (
                <p className="border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={post.isPending || reply.trim().length === 0}
                onClick={() => {
                  setError(null);
                  post.mutate();
                }}
                className="border border-cyan-500/70 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-40"
              >
                {post.isPending ? 'Transmitting…' : 'Post reply'}
              </button>
            </div>
          </>
        )}
      </ForumShell>
    </>
  );
};
