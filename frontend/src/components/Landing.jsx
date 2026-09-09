import { useEffect, useState } from 'react';
import { Bookmark, Film, History, Star, Users } from 'lucide-react';

const features = [
  { title: 'Track watched movies', description: 'Keep your viewing journey close and organize your history.', icon: History },
  { title: 'Build your custom watchlist', description: 'Save the films you want next for your perfect movie night.', icon: Bookmark },
  { title: 'Share reviews with friends', description: 'Turn every opinion into a conversation and rate your favorites.', icon: Users },
  { title: 'Discover top trending titles', description: 'Find the next film worth your time with custom recommendations.', icon: Star },
];

function Landing({ movies = [], onLoginClick, onRegisterClick }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const posters = movies.filter((movie) => movie.poster_url).map((movie) => movie.poster_url);
  const shuffled = posters.length > 1 ? [...posters.slice(1), posters[0]] : posters;
  const rowA = posters.length ? [...posters, ...posters] : [];
  const rowB = posters.length ? [...posters.slice().reverse(), ...posters.slice().reverse()] : [];
  const rowC = posters.length ? [...shuffled, ...shuffled] : [];
  const rowD = posters.length ? [...shuffled.slice().reverse(), ...shuffled.slice().reverse()] : [];

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      setAuthModalOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <main className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 overflow-hidden py-8 sm:py-12">
      {posters.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex min-h-screen flex-col justify-center gap-3 opacity-95">
          <div className="flex gap-4 animate-marquee-left">
            {rowA.map((url, index) => (
              <img key={`a-${index}`} src={url} alt="" className="h-40 w-28 flex-shrink-0 rounded-xl object-cover brightness-100 opacity-95 sm:h-56 sm:w-40" />
            ))}
          </div>
          <div className="flex gap-4 animate-marquee-right">
            {rowB.map((url, index) => (
              <img key={`b-${index}`} src={url} alt="" className="h-40 w-28 flex-shrink-0 rounded-xl object-cover brightness-100 opacity-95 sm:h-56 sm:w-40" />
            ))}
          </div>
          <div className="flex gap-4 animate-marquee-left" style={{ animationDuration: '75s' }}>
            {rowC.map((url, index) => (
              <img key={`c-${index}`} src={url} alt="" className="h-40 w-28 flex-shrink-0 rounded-xl object-cover brightness-100 opacity-95 sm:h-56 sm:w-40" />
            ))}
          </div>
          <div className="flex gap-4 animate-marquee-right" style={{ animationDuration: '85s' }}>
            {rowD.map((url, index) => (
              <img key={`d-${index}`} src={url} alt="" className="h-40 w-28 flex-shrink-0 rounded-xl object-cover brightness-100 opacity-95 sm:h-56 sm:w-40" />
            ))}
          </div>
        </div>
      )}
      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] sm:px-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Film className="h-5 w-5 text-cyan-300" />
          Cineverse
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onLoginClick} className="px-4 py-2 text-sm font-medium transition hover:text-cyan-200">Login</button>
          <button type="button" onClick={onRegisterClick} className="px-4 py-2 text-sm font-semibold transition hover:text-cyan-200">Sign up</button>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] max-w-5xl flex-col justify-center px-4 text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] sm:px-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center text-cyan-200">
          <Film className="h-10 w-10" />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Your movie life, in one place</p>
        <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">Track, discover, and share the movies you love.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white drop-shadow-md sm:text-lg">Build a watchlist for your next great night in, remember what you have watched, and find a little more magic in every film.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setAuthModalOpen(true)} className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">Get started</button>
          <span className="self-center text-sm text-white/80 drop-shadow-md">Press Space to sign in</span>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 pb-8 text-center text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="animate-feature-slide-in opacity-0" style={{ animationDelay: `${(index + 1) * 200}ms` }}>
              <div className="mx-auto flex h-10 w-10 items-center justify-center text-cyan-200"><Icon className="h-5 w-5" /></div>
              <h2 className="mt-3 text-base font-bold text-white">{feature.title}</h2>
              <p className="mt-1 text-sm leading-6 text-white/90">{feature.description}</p>
            </div>
          );
        })}
      </section>

      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" role="dialog" aria-modal="true" aria-label="Choose an account action" onClick={() => setAuthModalOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-white/30 bg-slate-950/75 p-6 text-center shadow-2xl backdrop-blur-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950"><Film className="h-6 w-6" /></div>
            <h2 className="mt-4 text-2xl font-bold text-white">Welcome to Cineverse</h2>
            <p className="mt-2 text-sm text-slate-200">Choose how you want to continue.</p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={onLoginClick} className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-slate-950">Login</button>
              <button type="button" onClick={onRegisterClick} className="rounded-full border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10">Register</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Landing;
