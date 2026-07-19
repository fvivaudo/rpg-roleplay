import { Link } from 'react-router';

export const ForumShell = ({
  breadcrumb,
  children,
}: {
  breadcrumb?: { label: string; to?: string }[];
  children: React.ReactNode;
}) => (
  <div className="h-full overflow-y-auto">
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-[0.3em] text-cyan-300">
          The Wire
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Out-of-character board. You post under your account name — your
          characters stay in the game.
        </p>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            <Link to="/app/forum" className="hover:text-cyan-300">
              Index
            </Link>
            {breadcrumb.map((crumb) => (
              <span key={crumb.label} className="flex items-center gap-2">
                <span className="text-slate-700">/</span>
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-cyan-300">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-300">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </header>
      {children}
    </div>
  </div>
);

export const formatDate = (value: Date | string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
