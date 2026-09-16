import { CalendarRange, Camera, Edit3, Film, MessageSquareText, Users, BookOpenText, Clock3, Sparkles } from 'lucide-react';

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

function ProfilePage({ user, profileData, onEdit, onNavigateUser, onNavigateSearch, onNavigateWatchlist }) {
  const stats = profileData?.stats || { watched: 0, reviews: 0, friends: 0, watchlists: 0 };
  const recentWatched = profileData?.recentWatched || [];
  const recentReviews = profileData?.recentReviews || [];
  const watchlists = profileData?.watchlists || [];

  return (
    <main className="mx-auto max-w-6xl pb-14 pt-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-950/70 shadow-[0_30px_80px_rgba(8,15,30,0.7)]">
        <div className="bg-gradient-to-r from-cyan-500/15 via-slate-900 to-indigo-500/15 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-cyan-400/40 bg-slate-900 shadow-lg shadow-cyan-500/10">
                <img src={user?.profile_image ? normalizeImage(user.profile_image) : getDefaultAvatar(user)} alt={user?.display_name || user?.name || 'Profile'} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.src = getDefaultAvatar(user); }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Profile</p>
                <h1 className="mt-2 text-3xl font-black text-white">{user?.display_name || user?.name || 'Your profile'}</h1>
                <p className="mt-1 text-slate-400">@{user?.username || user?.name || 'user'}</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{user?.bio || 'Tell the community what kinds of movies you love.'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onNavigateSearch} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white"><Sparkles className="h-4 w-4" />Search</button>
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-950"><Edit3 className="h-4 w-4" />Edit profile</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-800 bg-slate-900/30 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Movies watched', value: stats.watched, icon: Clock3 },
            { label: 'Reviews', value: stats.reviews, icon: MessageSquareText },
            { label: 'Watchlists', value: stats.watchlists, icon: BookOpenText },
            { label: 'Friends', value: stats.friends, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-400">{label}</span>
                <Icon className="h-4 w-4 text-cyan-300" />
              </div>
              <p className="mt-4 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">Recently watched</h2>
              <CalendarRange className="h-5 w-5 text-cyan-300" />
            </div>

            {recentWatched.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {recentWatched.map((movie) => (
                  <button type="button" key={movie.history_id || movie.movie_id} onClick={() => onNavigateUser && onNavigateUser(`/movie/${movie.movie_id}`)} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:border-cyan-400/60">
                    <img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="h-20 w-14 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{movie.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{movie.watched_at ? new Date(movie.watched_at).toLocaleDateString() : 'Recently added'}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No movies watched yet.</p>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">My reviews</h2>
              <MessageSquareText className="h-5 w-5 text-cyan-300" />
            </div>

            {recentReviews.length ? (
              <div className="space-y-3">
                {recentReviews.map((review) => (
                  <div key={review.review_id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                    <div className="flex items-center gap-3">
                      <img src={review.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={review.title} className="h-16 w-12 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate font-semibold text-white">{review.title}</p>
                          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">{Number(review.rating).toFixed(1)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">{review.review_text || 'No review text provided yet.'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No reviews yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">My watchlists</h2>
              <BookOpenText className="h-5 w-5 text-cyan-300" />
            </div>

            {watchlists.length ? (
              <div className="space-y-3">
                {watchlists.map((list) => (
                  <button type="button" key={list.watchlist_id} onClick={() => onNavigateWatchlist(list.watchlist_id)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/45 p-3 text-left hover:border-cyan-400/60">
                    <div>
                      <p className="font-semibold text-white">{list.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(list.created_at).toLocaleDateString()}</p>
                    </div>
                    <Film className="h-4 w-4 text-cyan-300" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No public watchlists yet.</p>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">Recommended for you</h2>
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/25 p-5 text-sm text-slate-400">
              Personalized recommendations are available on the home screen and movie detail pages.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
