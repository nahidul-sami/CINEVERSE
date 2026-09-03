import { Bookmark, Film, History, Star, Users } from 'lucide-react';

const features = [
  { title: 'Personal Watchlists', description: 'Keep every must-watch title in one place.', icon: Bookmark },
  { title: 'Track Watch History', description: 'Pick up where you left off across your movie journey.', icon: History },
  { title: 'Connect with Friends', description: 'Share your favorite discoveries with people you know.', icon: Users },
  { title: 'Rate & Review', description: 'Give every memorable performance the rating it deserves.', icon: Star },
];

function Landing({ onLoginClick, onRegisterClick }) {
  return (
    <main className="min-h-[calc(100vh-5rem)] py-12 sm:py-20">
      <section className="mx-auto max-w-5xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-2xl shadow-cyan-500/20">
          <Film className="h-10 w-10" />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Your movie life, in one place</p>
        <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">Track, discover, and share the movies you love.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Build a watchlist for your next great night in, remember what you have watched, and find a little more magic in every film.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onLoginClick} className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">Login</button>
          <button type="button" onClick={onRegisterClick} className="rounded-full border border-slate-700/80 bg-slate-900/50 px-6 py-3 text-slate-200 transition hover:border-cyan-400/70 hover:text-white">Sign up</button>
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ title, description, icon: Icon }) => (
          <div key={title} className="glass-panel rounded-[28px] border border-slate-800/80 p-5 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

export default Landing;
