import { useEffect, useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { movieApi, personApi, userApi } from '../api/api';

const normalizeImage = (value) => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `http://localhost:5000${value.startsWith('/') ? value : `/${value}`}`;
};

const getDefaultAvatar = (user) => {
  const label = (user?.display_name || user?.name || user?.username || 'U').charAt(0).toUpperCase();
  const svg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#67e8f9'/>
          <stop offset='100%' stop-color='#6366f1'/>
        </linearGradient>
      </defs>
      <rect width='240' height='240' rx='120' fill='url(#g)'/>
      <text x='50%' y='54%' font-size='96' text-anchor='middle' dominant-baseline='middle' fill='white' font-family='Arial, sans-serif' font-weight='700'>${label}</text>
    </svg>
  `)}`;
  return svg;
};

function SearchPage({ onOpenMovie, onOpenUser }) {
  const [tab, setTab] = useState('movies');
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [users, setUsers] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return undefined;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const [movieRes, userRes, personRes] = await Promise.all([
          movieApi.search({ q: trimmed, limit: 8 }),
          userApi.search({ q: trimmed, limit: 8 }),
          personApi.search({ q: trimmed, limit: 8 }),
        ]);
        setMovies(movieRes.data?.results || []);
        setUsers(userRes.data?.users || []);
        setPersons(personRes.data?.persons || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const visibleMovies = useMemo(() => (tab === 'movies' ? movies : []), [movies, tab]);
  const visibleUsers = useMemo(() => (tab === 'users' ? users : []), [tab, users]);
  const visiblePersons = useMemo(() => (tab === 'people' ? persons : []), [persons, tab]);

  return (
    <main className="mx-auto max-w-5xl py-8">
      <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(8,15,30,0.7)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Discover</p>
            <h1 className="mt-2 text-3xl font-black text-white">Search Cineverse</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 p-1">
            <button type="button" onClick={() => setTab('movies')} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === 'movies' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'text-slate-300'}`}>Movies</button>
            <button type="button" onClick={() => setTab('users')} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === 'users' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'text-slate-300'}`}>Users</button>
            <button type="button" onClick={() => setTab('people')} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === 'people' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'text-slate-300'}`}>People</button>
          </div>
        </div>

        <label className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-slate-300">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'movies' ? 'Search movies by title or description' : tab === 'people' ? 'Search actors, actresses, or directors' : 'Search users by name or username'} className="w-full bg-transparent text-white placeholder:text-slate-500 focus:outline-none" />
        </label>

        {error && <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        {loading && <div className="mt-6 text-sm text-slate-400">Searching...</div>}

        {!loading && !query.trim() && <div className="mt-6 text-sm text-slate-400">Type to search movies or people.</div>}

        {!loading && query.trim() && tab === 'movies' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visibleMovies.length ? visibleMovies.map((movie) => (
              <button key={movie.movie_id} type="button" onClick={() => onOpenMovie(movie.movie_id)} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:border-cyan-400/60">
                <img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="h-20 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{movie.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{movie.release_year || 'N/A'}</p>
                </div>
              </button>
            )) : <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/25 p-5 text-sm text-slate-400">No movies found.</div>}
          </div>
        )}

        {!loading && query.trim() && tab === 'users' && (
          <div className="mt-6 grid gap-4">
            {visibleUsers.length ? visibleUsers.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                <button type="button" onClick={() => onOpenUser(user.user_id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <img src={user.profile_image ? normalizeImage(user.profile_image) : getDefaultAvatar(user)} alt={user.display_name || user.name} className="h-12 w-12 rounded-full object-cover" onError={(event) => { event.currentTarget.src = getDefaultAvatar(user); }} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{user.display_name || user.name}</p>
                    <p className="truncate text-sm text-slate-400">@{user.username || user.name}</p>
                  </div>
                </button>
                <button type="button" onClick={() => onOpenUser(user.user_id)} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white"><UserRound className="h-4 w-4" />View profile</button>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/25 p-5 text-sm text-slate-400">No users found.</div>}
          </div>
        )}

        {!loading && query.trim() && tab === 'people' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visiblePersons.length ? visiblePersons.map((person) => (
              <div key={person.person_id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                {person.profile_url ? <img src={person.profile_url} alt={person.name} className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-lg font-bold text-slate-950">{person.name?.charAt(0).toUpperCase()}</div>}
                <div className="min-w-0"><p className="truncate font-semibold text-white">{person.name}</p><p className="mt-1 text-xs capitalize text-cyan-300">{person.person_type || 'Cast & crew'}</p></div>
              </div>
            )) : <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/25 p-5 text-sm text-slate-400">No people found.</div>}
          </div>
        )}
      </div>
    </main>
  );
}

export default SearchPage;
