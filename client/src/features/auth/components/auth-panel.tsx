import { useState } from 'react';
import { useNavigate } from 'react-router';

import {
  loginInputSchema,
  registerInputSchema,
  useLogin,
  useRegister,
} from '@/lib/auth';
import { cn } from '@/utils/cn';

type Mode = 'login' | 'register';

const inputClass =
  'w-full rounded-sm border border-cyan-900/60 bg-black/60 px-3 py-2 text-sm text-cyan-100 ' +
  'placeholder-slate-600 outline-none transition-colors focus:border-cyan-400';

const labelClass =
  'mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400';

/**
 * Login/register tabs for the landing page. Signup logs the account in
 * server-side (cookies set in the response), so both paths land in the app.
 */
export const AuthPanel = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useLogin({
    onSuccess: () => navigate('/app/game'),
    onError: (err: unknown) => setError(messageOf(err)),
  });
  const register = useRegister({
    onSuccess: () => navigate('/app/game'),
    onError: (err: unknown) => setError(messageOf(err)),
  });

  const pending = login.isPending || register.isPending;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'login') {
      const parsed = loginInputSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.errors[0].message);
        return;
      }
      login.mutate(parsed.data);
    } else {
      const parsed = registerInputSchema.safeParse({ email, name, password });
      if (!parsed.success) {
        setError(parsed.error.errors[0].message);
        return;
      }
      register.mutate(parsed.data);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="w-full max-w-sm border border-cyan-900/60 bg-[#0b0b14]/90 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
      <div className="flex border-b border-cyan-900/60">
        {(['login', 'register'] as Mode[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchMode(tab)}
            className={cn(
              'flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition-colors',
              mode === tab
                ? 'bg-cyan-950/40 text-cyan-300'
                : 'text-slate-500 hover:text-slate-300',
            )}
          >
            {tab === 'login' ? 'Jack in' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4 p-6">
        {mode === 'register' && (
          <div>
            <label htmlFor="auth-name" className={labelClass}>
              Account name
            </label>
            <input
              id="auth-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your handle on the forum"
              autoComplete="username"
            />
            <p className="mt-1 text-[11px] text-slate-600">
              Public on the forum — separate from your characters&apos; names.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className={labelClass}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@sprawl.net"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className={labelClass}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && (
          <p className="border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            'w-full border border-cyan-500/70 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold',
            'uppercase tracking-[0.25em] text-cyan-300 transition-colors',
            'hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {pending ? '…' : mode === 'login' ? 'Enter Nekron' : 'Create account'}
        </button>
      </form>
    </div>
  );
};

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  const maybe = err as { message?: string; value?: { message?: string } };
  return maybe?.value?.message ?? maybe?.message ?? 'Something went wrong.';
}
