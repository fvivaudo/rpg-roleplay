import { NavLink } from 'react-router';

import { useLogout, useUser } from '@/lib/auth';
import { cn } from '@/utils/cn';

const NAVIGATION = [
  { name: 'Game', to: '/app/game' },
  { name: 'Characters', to: '/app/characters' },
  { name: 'Editor', to: '/app/editor' },
  { name: 'Forum', to: '/app/forum' },
];

/**
 * App shell: a slim neon top bar over a full-height content area. The game
 * canvas and editor grid own their scroll; the bar never does.
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const user = useUser();

  return (
    <div className="flex h-screen flex-col bg-[#07070d] text-slate-200">
      <header className="flex h-12 shrink-0 items-center gap-6 border-b border-cyan-900/50 bg-[#0b0b14] px-4">
        <NavLink
          to="/app/game"
          className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300"
          style={{ textShadow: '0 0 12px rgba(34,211,238,0.5)' }}
        >
          Nekron
        </NavLink>

        <nav className="flex items-center gap-1">
          {NAVIGATION.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition-colors',
                  isActive
                    ? 'bg-cyan-950/50 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-200',
                )
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {user.data?.name}
          </span>
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() => logout.mutate({})}
            className="border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400 transition-colors hover:border-rose-700 hover:text-rose-300 disabled:opacity-50"
          >
            Jack out
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
