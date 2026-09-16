import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, MessageSquareText, Sparkles, UserPlus, Users } from 'lucide-react';
import { friendshipApi, userApi } from '../api/api';

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

function PublicProfilePage({ userId, currentUser, friends, pendingRequests, sentRequests, onFriendAction }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await userApi.getById(userId);
        if (!ignore) setProfile(response.data);
      } catch (err) {
        if (!ignore) setError(err?.response?.data?.message || 'User not found');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadProfile();
    return () => { ignore = true; };
  }, [userId]);

  const relationship = useMemo(() => {
    if (!profile || !currentUser) return 'none';
    if (Number(profile.user.user_id) === Number(currentUser.user_id)) return 'self';
    const friendRows = friends || [];
    const pendingRows = pendingRequests || [];
    const sentRows = sentRequests || [];
    if (friendRows.some((friend) => Number(friend.user_id) === Number(profile.user.user_id))) return 'friends';
    if (pendingRows.some((request) => Number(request.sender_id) === Number(profile.user.user_id))) return 'received';
    if (sentRows.some((request) => Number(request.recipient_id) === Number(profile.user.user_id))) return 'sent';
    return 'none';
  }, [currentUser, friends, pendingRequests, profile, sentRequests]);

  const handleFriendAction = async () => {
    if (!profile) return;
    if (relationship === 'none') {
      await onFriendAction(profile.user.user_id, 'send');
    }
    if (relationship === 'received') {
      const incoming = pendingRequests.find((request) => Number(request.sender_id) === Number(profile.user.user_id));
      if (incoming) await onFriendAction(incoming.friendship_id, 'accept');
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-5xl py-8"><div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 text-slate-300">Loading profile...</div></main>;
  }

  if (error || !profile?.user) {
    return <main className="mx-auto max-w-5xl py-8"><div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 text-slate-300">User not found.</div></main>;
  }

  const user = profile.user;
  const stats = profile.stats || { watched: 0, reviews: 0, friends: 0, watchlists: 0 };
  const recentWatched = profile.recentWatched || [];
  const recentReviews = profile.recentReviews || [];
  const watchlists = profile.watchlists || [];

  const friendButtonText = relationship === 'friends' ? 'Friends' : relationship === 'sent' ? 'Request sent' : relationship === 'received' ? 'Accept request' : 'Add friend';

  return (
    <main className="mx-auto max-w-6xl pb-14 pt-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-950/70 shadow-[0_30px_80px_rgba(8,15,30,0.7)]">
        <div className="bg-gradient-to-r from-cyan-500/15 via-slate-900 to-indigo-500/15 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-cyan-400/40 bg-slate-900">
                <img src={user.profile_image ? normalizeImage(user.profile_image) : getDefaultAvatar(user)} alt={user.display_name || user.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.src = getDefaultAvatar(user); }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Public profile</p>
                <h1 className="mt-2 text-3xl font-black text-white">{user.display_name || user.name}</h1>
                <p className="mt-1 text-slate-400">@{user.username || user.name}</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{user.bio || 'Movie enthusiast sharing thoughts and favorites.'}</p>
              </div>
            </div>

            {relationship !== 'self' && (
              <button type="button" onClick={handleFriendAction} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-950">
                <UserPlus className="h-4 w-4" />
                {friendButtonText}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-800 bg-slate-900/30 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Movies watched', value: stats.watched, icon: Users },
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
            <h2 className="text-xl font-bold text-white">Recently watched</h2>
            {recentWatched.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {recentWatched.map((movie) => (
                  <div key={movie.history_id || movie.movie_id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                    <img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="h-20 w-14 rounded-xl object-cover" />
                    <div>
                      <p className="font-semibold text-white">{movie.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{movie.watched_at ? new Date(movie.watched_at).toLocaleDateString() : 'Just now'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 text-sm text-slate-400">No watched movies yet.</p>}
          </div>

          <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/60 p-5">
            <h2 className="text-xl font-bold text-white">Reviews</h2>
            {recentReviews.length ? (
              <div className="mt-4 space-y-3">
                {recentReviews.map((review) => (
                  <div key={review.review_id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{review.title}</p>
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">{Number(review.rating).toFixed(1)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{review.review_text || 'No review text provided.'}</p>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 text-sm text-slate-400">No reviews yet.</p>}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/60 p-5">
          <h2 className="text-xl font-bold text-white">Public watchlists</h2>
          {watchlists.length ? (
            <div className="mt-4 space-y-3">
              {watchlists.map((list) => (
                <div key={list.watchlist_id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                  <p className="font-semibold text-white">{list.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Created {new Date(list.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-slate-400">No public watchlists yet.</p>}
        </div>
      </section>
    </main>
  );
}

export default PublicProfilePage;
