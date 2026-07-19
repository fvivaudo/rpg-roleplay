import { Head } from '@/components/seo';
import { AuthPanel } from '@/features/auth/components/auth-panel';

export const LandingRoute = () => {
  return (
    <>
      <Head title="Nekron" description="Nekron — a cyberpunk roleplay MMO" />
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070d] px-4"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      >
        {/* neon glow accents */}
        <div className="pointer-events-none absolute -left-32 top-1/4 size-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-1/4 size-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative flex w-full max-w-4xl flex-col items-center gap-10 py-16">
          <header className="text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.6em] text-fuchsia-400/80">
              The sprawl is waiting
            </p>
            <h1
              className="text-6xl font-black uppercase tracking-[0.3em] text-cyan-300 sm:text-7xl"
              style={{ textShadow: '0 0 30px rgba(34,211,238,0.45)' }}
            >
              Nekron
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              A 2D cyberpunk roleplay MMO. One shared city, played in text and
              neon — your character is what you say, wear, and do.
            </p>
          </header>

          <AuthPanel />

          <footer className="text-[11px] uppercase tracking-[0.3em] text-slate-600">
            V0 — expect exposed wiring
          </footer>
        </div>
      </div>
    </>
  );
};
