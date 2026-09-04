import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CalendarRange,
  Check,
  CirclePlay,
  Clock3,
  Film,
  Flame,
  LoaderCircle,
  MessageSquareText,
  MonitorPlay,
  Play,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  Trash2,
  Tv,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  authApi,
  genreApi,
  movieApi,
  reviewApi,
  personApi,
  watchHistoryApi,
  watchlistApi,
  friendshipApi,
} from './api/api';
import Landing from './components/Landing';

const dashboardTabs = ['Profile', 'Watchlists', 'History', 'Friends'];
const adminTabs = ['Manage Movies', 'Manage Genres', 'Cast & Crew Assignment'];

const getHashRoute = () => {
  const path = window.location.hash.replace(/^#/, '') || '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const toDisplayNumber = (value) => Number(value ?? 0).toFixed(1);

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cineverse_user') || 'null');
    } catch {
      return null;
    }
  });
  const [route, setRoute] = useState(() => getHashRoute());
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [movieDetail, setMovieDetail] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [selectedGenreId, setSelectedGenreId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [watchProgress, setWatchProgress] = useState(0);
  const [dashboardTab, setDashboardTab] = useState('Profile');
  const [adminTab, setAdminTab] = useState('Manage Movies');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState({ movies: false, detail: false, profile: false, history: false, watchlists: false, friends: false, page: true });
  const [friendEmail, setFriendEmail] = useState('');
  const [movieForm, setMovieForm] = useState({ title: '', description: '', release_year: '', duration: '', language: '', rating: '', poster_url: '', trailer_url: '' });
  const [genreForm, setGenreForm] = useState({ name: '', description: '' });
  const [creditForm, setCreditForm] = useState({ name: '', person_type: 'actor', character_name: '', movie_id: '' });
  const [movieSearch, setMovieSearch] = useState('');
  const [movieModalOpen, setMovieModalOpen] = useState(false);
  const [movieSubmitting, setMovieSubmitting] = useState(false);
  const [deleteMovieId, setDeleteMovieId] = useState(null);
  const [assignMovie, setAssignMovie] = useState(null);
  const [people, setPeople] = useState([]);
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      void error;
    }

    localStorage.removeItem('token');
    localStorage.removeItem('cineverse_user');
    setToken(null);
    setUser(null);
    setWatchHistory([]);
    setWatchlists([]);
    setFriends([]);
    setPendingRequests([]);
    setSentRequests([]);
    setRoute('/');
    window.location.hash = '/';
  }, []);

  useEffect(() => {
    const handleHashChange = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (getHashRoute() !== route) {
      window.location.hash = route;
    }
  }, [route]);

  useEffect(() => {
    if (token) {
      authApi.profile()
        .then(({ data }) => {
          const profileUser = data?.user || data;
          setUser(profileUser);
          localStorage.setItem('cineverse_user', JSON.stringify(profileUser));
        })
        .catch((error) => {
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            handleLogout();
            return;
          }
          showToast(error?.response?.data?.message || 'Could not fetch profile', 'error');
        });
    }
  }, [token, handleLogout, showToast]);

  useEffect(() => {
    const autoRoute = route === '/login' || route === '/register' ? route : route === '/admin' && user?.role !== 'admin' ? '/login' : route === '/' && user?.role === 'admin' ? '/admin' : route;
    if (autoRoute !== route) {
      window.location.hash = autoRoute;
    }
  }, [route, user]);

  useEffect(() => {
    if (!token) return;

    const loadDashboardData = async () => {
      setLoading((prev) => ({ ...prev, history: true, watchlists: true, friends: true }));
      try {
        const [historyRes, listRes, friendsRes, pendingRes, sentRes] = await Promise.all([
          watchHistoryApi.getAll(),
          watchlistApi.getAll(),
          friendshipApi.getFriends(),
          friendshipApi.getPending(),
          friendshipApi.getSent(),
        ]);
        setWatchHistory(historyRes.data?.history || []);
        setWatchlists(listRes.data?.watchlists || []);
        setFriends(friendsRes.data?.friends || []);
        setPendingRequests(pendingRes.data?.requests || []);
        setSentRequests(sentRes.data?.requests || []);
      } catch (error) {
        showToast(error?.response?.data?.message || 'Could not load dashboard data', 'error');
      } finally {
        setLoading((prev) => ({ ...prev, history: false, watchlists: false, friends: false }));
      }
    };

    loadDashboardData();
  }, [token, showToast]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const response = await genreApi.getAll();
        setGenres(response.data || []);
      } catch (error) {
        showToast(error?.response?.data?.message || 'Failed to load genres', 'error');
      }
    };

    const loadMovies = async () => {
      setLoading((prev) => ({ ...prev, movies: true, page: false }));
      try {
        const params = {};
        if (selectedGenreId !== 'all') params.genre_id = selectedGenreId;
        const response = await movieApi.getAll(params);
        setMovies(response.data || []);
      } catch (error) {
        showToast(error?.response?.data?.message || 'Failed to load movies', 'error');
        setMovies([]);
      } finally {
        setLoading((prev) => ({ ...prev, movies: false }));
      }
    };

    loadGenres();
    loadMovies();
  }, [selectedGenreId, showToast]);

  useEffect(() => {
    const slug = route.match(/^\/movie\/(\d+)$/);
    if (!slug) {
      return;
    }

    const movieId = Number(slug[1]);
    const fetchMovieDetails = async () => {
      setLoading((prev) => ({ ...prev, detail: true }));
      try {
        const detailResponse = await movieApi.getById(movieId);
        const movie = detailResponse.data?.movie || detailResponse.data || null;
        setMovieDetail(movie);

        const reviewResponse = await reviewApi.listByMovie(movieId);
        setReviews(reviewResponse.data?.reviews || []);
      } catch (error) {
        showToast(error?.response?.data?.message || 'Movie not found', 'error');
        setMovieDetail(null);
        setReviews([]);
      } finally {
        setLoading((prev) => ({ ...prev, detail: false }));
      }
    };

    fetchMovieDetails();
  }, [route, showToast]);

  const filteredMovies = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const list = [...movies];

    return list
      .filter((movie) => {
        const matchesGenre = selectedGenreId === 'all' || (movie.genre_id && Number(movie.genre_id) === Number(selectedGenreId));
        const haystack = `${movie.title || ''} ${movie.description || ''}`.toLowerCase();
        return matchesGenre && (!search || haystack.includes(search));
      })
      .sort((a, b) => {
        if (sortBy === 'year') return Number(b.release_year || 0) - Number(a.release_year || 0);
        if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
        return Number(b.rating || 0) - Number(a.rating || 0);
      });
  }, [movies, searchTerm, selectedGenreId, sortBy]);

  const featuredMovie = filteredMovies[0] || movieDetail || movies[0] || null;

  const selectedMovie = movieDetail || (filteredMovies[0] ?? null);

  const handleAuthInput = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    try {
      const result = authMode === 'login'
        ? await authApi.login({ email: authForm.email, password: authForm.password })
        : await authApi.register({ name: authForm.name, email: authForm.email, password: authForm.password });

      if (authMode === 'login') {
        const { token: jwt, user: authUser } = result.data;
        localStorage.setItem('token', jwt);
        localStorage.setItem('cineverse_user', JSON.stringify(authUser));
        setToken(jwt);
        setUser(authUser);
        const nextRoute = authUser?.role === 'admin' ? '/admin' : '/';
        window.location.hash = nextRoute;
        setRoute(nextRoute);
        showToast('Logged in successfully');
      } else {
        showToast('Registration successful. Please sign in.', 'success');
        setAuthMode('login');
        setAuthForm({ name: '', email: '', password: '' });
      }
    } catch (error) {
      showToast(error?.response?.data?.message || 'Authentication failed', 'error');
    }
  };

  const handleMovieOpen = (movieId) => {
    setRoute(`/movie/${movieId}`);
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!token) {
      showToast('Please sign in to leave a review', 'error');
      return;
    }

    if (!movieDetail || !reviewText.trim()) {
      showToast('Please enter a review before submitting', 'error');
      return;
    }

    try {
      await reviewApi.create({
        movie_id: movieDetail.movie_id,
        rating: Number(reviewRating),
        review_text: reviewText,
      });
      setReviewText('');
      setReviewRating(5);
      const refreshed = await reviewApi.listByMovie(movieDetail.movie_id);
      setReviews(refreshed.data?.reviews || []);
      showToast('Review submitted');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Review submission failed', 'error');
    }
  };

  const updateReview = async (review) => {
    const nextText = window.prompt('Edit your review:', review.review_text || '');
    if (nextText === null) return;

    const nextRating = Number(window.prompt('Update your rating (0-10):', review.rating ?? '5'));
    if (Number.isNaN(nextRating) || nextRating < 0 || nextRating > 10) {
      showToast('Rating must be between 0 and 10', 'error');
      return;
    }

    try {
      await reviewApi.update(review.review_id, {
        rating: nextRating,
        review_text: nextText,
      });
      const refreshed = await reviewApi.listByMovie(movieDetail.movie_id);
      setReviews(refreshed.data?.reviews || []);
      showToast('Review updated');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Review update failed', 'error');
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;

    try {
      await reviewApi.remove(reviewId);
      const refreshed = await reviewApi.listByMovie(movieDetail.movie_id);
      setReviews(refreshed.data?.reviews || []);
      showToast('Review removed');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Review deletion failed', 'error');
    }
  };

  const saveProgress = async () => {
    if (!token || !movieDetail) {
      showToast('Sign in to save progress', 'error');
      return;
    }

    try {
      const existing = watchHistory.find((item) => Number(item.movie_id) === Number(movieDetail.movie_id));
      if (existing) {
        await watchHistoryApi.updateProgress(existing.history_id, { progress: watchProgress });
      } else {
        await watchHistoryApi.add({ movie_id: movieDetail.movie_id, progress: watchProgress });
      }
      const historyResponse = await watchHistoryApi.getAll();
      setWatchHistory(historyResponse.data?.history || []);
      showToast('Progress saved');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Unable to save progress', 'error');
    }
  };

  const addMovieToWatchlist = async (movie) => {
    if (!token) {
      showToast('Sign in to use watchlists', 'error');
      return;
    }

    try {
      let targetList = watchlists[0];
      if (!targetList) {
        const created = await watchlistApi.create({ name: 'My Watchlist' });
        targetList = created.data?.watchlist;
        setWatchlists((prev) => [...prev, targetList]);
      }

      await watchlistApi.addMovie(targetList.watchlist_id, { movie_id: movie.movie_id || movie.id || movie.movieId });
      const refreshed = await watchlistApi.getAll();
      setWatchlists(refreshed.data?.watchlists || []);
      showToast('Added to watchlist');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not add movie to watchlist', 'error');
    }
  };

  const sendFriendRequest = async (event) => {
    event.preventDefault();
    if (!friendEmail.trim()) {
      showToast('Enter a friend email address', 'error');
      return;
    }

    try {
      const lookup = await friendshipApi.lookupUserByEmail(friendEmail.trim());
      await friendshipApi.sendRequest({ friend_id: lookup.data?.user?.user_id });
      setFriendEmail('');
      showToast('Friend request sent');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not send friend request', 'error');
    }
  };

  const respondToFriendRequest = async (friendshipId, status) => {
    try {
      await friendshipApi.respond(friendshipId, { status });
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        friendshipApi.getFriends(),
        friendshipApi.getPending(),
        friendshipApi.getSent(),
      ]);
      setFriends(friendsRes.data?.friends || []);
      setPendingRequests(pendingRes.data?.requests || []);
      setSentRequests(sentRes.data?.requests || []);
      showToast(status === 'accepted' ? 'Friend request accepted' : 'Friend request rejected');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not update friend request', 'error');
    }
  };

  const removeFriend = async (friendshipId) => {
    try {
      await friendshipApi.remove(friendshipId);
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        friendshipApi.getFriends(),
        friendshipApi.getPending(),
        friendshipApi.getSent(),
      ]);
      setFriends(friendsRes.data?.friends || []);
      setPendingRequests(pendingRes.data?.requests || []);
      setSentRequests(sentRes.data?.requests || []);
      showToast('Friendship removed');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not remove friendship', 'error');
    }
  };

  const createMovie = async (event) => {
    event.preventDefault();
    if (!movieForm.title.trim() || !movieForm.description.trim()) {
      showToast('Title and description are required', 'error');
      return;
    }
    setMovieSubmitting(true);

    try {
      await movieApi.create({
        title: movieForm.title,
        description: movieForm.description,
        release_year: Number(movieForm.release_year),
        duration: Number(movieForm.duration),
        language: movieForm.language,
        rating: Number(movieForm.rating),
        poster_url: movieForm.poster_url,
        trailer_url: movieForm.trailer_url,
      });
      setMovieForm({ title: '', description: '', release_year: '', duration: '', language: '', rating: '', poster_url: '', trailer_url: '' });
      const response = await movieApi.getAll();
      setMovies(response.data || []);
      setMovieModalOpen(false);
      showToast('Movie created successfully');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Movie creation failed', 'error');
    } finally {
      setMovieSubmitting(false);
    }
  };

  const deleteMovie = async () => {
    try {
      await movieApi.remove(deleteMovieId);
      setMovies((current) => current.filter((movie) => Number(movie.movie_id) !== Number(deleteMovieId)));
      setDeleteMovieId(null);
      showToast('Movie deleted successfully');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Movie deletion failed', 'error');
    }
  };

  const openAssignModal = async (movie) => {
    setAssignMovie(movie);
    setCreditForm((current) => ({ ...current, movie_id: movie.movie_id, person_type: 'actor', character_name: '' }));
    try {
      const response = await personApi.getAll();
      setPeople(response.data || []);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not load people', 'error');
    }
  };

  const createGenre = async (event) => {
    event.preventDefault();

    try {
      await genreApi.create(genreForm);
      setGenreForm({ name: '', description: '' });
      const response = await genreApi.getAll();
      setGenres(response.data || []);
      showToast('Genre created successfully');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Genre creation failed', 'error');
    }
  };

  const attachCredit = async (event) => {
    event.preventDefault();
    setCreditSubmitting(true);

    try {
      await personApi.addMovieCredit(Number(creditForm.movie_id), {
        person_id: Number(creditForm.name),
        credit_type: creditForm.person_type,
        character_name: creditForm.character_name,
      });
      setAssignMovie(null);
      showToast('Cast/crew credit assigned');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not attach credit', 'error');
    } finally {
      setCreditSubmitting(false);
    }
  };

  const authButtonLabel = user ? 'Explorer' : 'Login';
  const renderRoute = () => {
    if (route === '/login' || route === '/register') {
      return (
        <div className="mx-auto max-w-md py-16">
          <div className="glass-panel rounded-[28px] border border-slate-800/80 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Welcome back</p>
                <h2 className="mt-2 text-3xl font-black text-white">{authMode === 'login' ? 'Login to Cineverse' : 'Create your account'}</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950">
                <Film className="h-6 w-6" />
              </div>
            </div>

            <div className="mb-5 flex gap-2 rounded-full border border-slate-700 bg-slate-900/40 p-1">
              <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${authMode === 'login' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'text-slate-300'}`}>
                Login
              </button>
              <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${authMode === 'register' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'text-slate-300'}`}>
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Full name</span>
                  <input name="name" value={authForm.name} onChange={handleAuthInput} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/80" placeholder="Your name" required />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Email</span>
                <input type="email" name="email" value={authForm.email} onChange={handleAuthInput} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/80" placeholder="you@example.com" required />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Password</span>
                <input type="password" name="password" value={authForm.password} onChange={handleAuthInput} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/80" placeholder="••••••••" required />
              </label>

              <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 font-semibold text-slate-950">
                {authMode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (!token) {
      return (
        <Landing
          onLoginClick={() => { setAuthMode('login'); window.location.hash = '/login'; setRoute('/login'); }}
          onRegisterClick={() => { setAuthMode('register'); window.location.hash = '/register'; setRoute('/register'); }}
        />
      );
    }

    if (route === '/admin') {
      return (
        <div className="space-y-6 py-8">
          <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
            <div className="flex flex-wrap gap-2">
              {adminTabs.map((tab) => (
                <button key={tab} type="button" onClick={() => setAdminTab(tab)} className={`rounded-full px-4 py-2 text-sm font-medium ${adminTab === tab ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'border border-slate-700 bg-slate-900/40 text-slate-300'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {adminTab === 'Manage Movies' && (
            <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Catalog control</p>
                  <h3 className="mt-1 text-2xl font-bold text-white">Manage movies</h3>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input value={movieSearch} onChange={(event) => setMovieSearch(event.target.value)} className="w-full rounded-full border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-cyan-400/80 sm:w-56" placeholder="Search by title" />
                  </label>
                  <button type="button" onClick={() => setMovieModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950">
                    <Plus className="h-4 w-4" /> Add New Movie
                  </button>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <tr><th className="px-3 py-3">Poster</th><th className="px-3 py-3">Title</th><th className="px-3 py-3">Release Year</th><th className="px-3 py-3">Duration</th><th className="px-3 py-3">Language</th><th className="px-3 py-3">Rating</th><th className="px-3 py-3">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {loading.movies ? Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`movie-skeleton-${index}`}><td colSpan="7" className="px-3 py-5"><div className="h-5 animate-pulse rounded bg-slate-800" /></td></tr>
                    )) : movies.filter((movie) => (movie.title || '').toLowerCase().includes(movieSearch.trim().toLowerCase())).map((movie) => {
                      const movieId = movie.movie_id || movie.id;
                      return (
                        <tr key={movieId} className="text-slate-300">
                          <td className="px-3 py-3"><img src={movie.poster_url || 'https://placehold.co/48x68/0f172a/67e8f9?text=Film'} alt="" className="h-16 w-11 rounded-lg object-cover" /></td>
                          <td className="max-w-[220px] px-3 py-3 font-semibold text-white">{movie.title}</td>
                          <td className="px-3 py-3">{movie.release_year || 'N/A'}</td>
                          <td className="px-3 py-3">{movie.duration ? `${movie.duration} min` : 'N/A'}</td>
                          <td className="px-3 py-3">{movie.language || 'N/A'}</td>
                          <td className="px-3 py-3 text-amber-300">{toDisplayNumber(movie.rating)}</td>
                          <td className="px-3 py-3"><div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleMovieOpen(movieId)} className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-400/70"><MonitorPlay className="h-3.5 w-3.5" /> View</button>
                            <button type="button" onClick={() => openAssignModal(movie)} className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10">Assign Cast/Crew</button>
                            <button type="button" onClick={() => setDeleteMovieId(movieId)} className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-400/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!movies.length && <div className="py-10 text-center text-slate-500">No movies found.</div>}
              </div>
            </div>
          )}

          {adminTab === 'Manage Genres' && (
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <form onSubmit={createGenre} className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                <h3 className="mb-4 text-xl font-bold text-white">Create genre</h3>
                <div className="space-y-3">
                  <input value={genreForm.name} onChange={(event) => setGenreForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white" placeholder="Genre name" required />
                  <textarea value={genreForm.description} onChange={(event) => setGenreForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white" placeholder="Description" rows="4" />
                  <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 font-semibold text-slate-950">Create genre</button>
                </div>
              </form>

              <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                <h3 className="mb-4 text-xl font-bold text-white">All genres</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {genres.map((genre) => (
                    <div key={genre.genre_id} className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
                      <p className="font-semibold text-white">{genre.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{genre.description || 'No description provided'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'Cast & Crew Assignment' && (
            <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Cast and crew</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Assign credits from the movie catalog</h3>
              <p className="mt-2 max-w-xl text-slate-400">Choose a movie in Manage Movies and use Assign Cast/Crew to connect an existing person to it.</p>
            </div>
          )}

          {movieModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
              <form onSubmit={createMovie} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Catalog control</p><h3 className="mt-1 text-2xl font-bold text-white">Add new movie</h3></div><button type="button" onClick={() => setMovieModalOpen(false)} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Title</span><input value={movieForm.title} onChange={(event) => setMovieForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" required /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Description</span><textarea value={movieForm.description} onChange={(event) => setMovieForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" rows="4" required /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Release Year</span><input type="number" value={movieForm.release_year} onChange={(event) => setMovieForm((current) => ({ ...current, release_year: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Duration (mins)</span><input type="number" value={movieForm.duration} onChange={(event) => setMovieForm((current) => ({ ...current, duration: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Language</span><input value={movieForm.language} onChange={(event) => setMovieForm((current) => ({ ...current, language: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Rating</span><input type="number" step="0.1" value={movieForm.rating} onChange={(event) => setMovieForm((current) => ({ ...current, rating: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Poster URL</span><input type="url" value={movieForm.poster_url} onChange={(event) => setMovieForm((current) => ({ ...current, poster_url: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Trailer URL</span><input type="url" value={movieForm.trailer_url} onChange={(event) => setMovieForm((current) => ({ ...current, trailer_url: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                </div>
                <button type="submit" disabled={movieSubmitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{movieSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />} {movieSubmitting ? 'Creating...' : 'Create Movie'}</button>
              </form>
            </div>
          )}

          {deleteMovieId !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[28px] border border-rose-400/30 bg-slate-900 p-6 shadow-2xl"><h3 className="text-xl font-bold text-white">Delete movie?</h3><p className="mt-2 text-slate-400">Are you sure you want to delete this movie?</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteMovieId(null)} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button><button type="button" onClick={deleteMovie} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Delete</button></div></div></div>
          )}

          {assignMovie && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><form onSubmit={attachCredit} className="w-full max-w-lg rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{assignMovie.title}</p><h3 className="mt-1 text-2xl font-bold text-white">Assign cast or crew</h3></div><button type="button" onClick={() => setAssignMovie(null)} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div><div className="space-y-4"><label className="block"><span className="mb-1 block text-sm text-slate-300">Select Person</span><select value={creditForm.name} onChange={(event) => setCreditForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" required><option value="">Choose a person</option>{people.map((person) => <option key={person.person_id} value={person.person_id}>{person.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-sm text-slate-300">Credit Type</span><select value={creditForm.person_type} onChange={(event) => setCreditForm((current) => ({ ...current, person_type: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white"><option value="actor">Actor</option><option value="director">Director</option><option value="writer">Writer</option><option value="producer">Producer</option></select></label><label className="block"><span className="mb-1 block text-sm text-slate-300">Character Name (optional)</span><input value={creditForm.character_name} onChange={(event) => setCreditForm((current) => ({ ...current, character_name: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label></div><button type="submit" disabled={creditSubmitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{creditSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />} {creditSubmitting ? 'Assigning...' : 'Assign Credit'}</button></form></div>
          )}
        </div>
      );
    }

    return (
      <>
        <section className="relative mt-8 overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-950 shadow-[0_40px_100px_rgba(8,15,30,0.8)]">
          {featuredMovie ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(9,13,22,0.92) 0%, rgba(9,13,22,0.75) 30%, rgba(9,13,22,0.65) 65%, rgba(9,13,22,0.78) 100%), url('${featuredMovie.backdrop_url || featuredMovie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'}')`,
                }}
              />

              <div className="relative grid gap-8 px-6 py-8 md:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-10">
                <div className="max-w-xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
                    <Flame className="h-3.5 w-3.5" />
                    Trending tonight
                  </div>

                  <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">{featuredMovie.title}</h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2.5 py-1.5"><CalendarRange className="h-4 w-4 text-cyan-300" />{featuredMovie.release_year || 'N/A'}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2.5 py-1.5"><Clock3 className="h-4 w-4 text-cyan-300" />{featuredMovie.duration ? `${featuredMovie.duration} min` : 'Runtime not set'}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2.5 py-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{toDisplayNumber(featuredMovie.rating)}</span>
                  </div>

                  <p className="mt-5 max-w-lg text-base leading-7 text-slate-200/80">{featuredMovie.description}</p>

                  <div className="mt-7 flex flex-wrap gap-4">
                    <button type="button" onClick={() => handleMovieOpen(featuredMovie.movie_id || featuredMovie.id)} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 py-3 text-sm font-semibold text-slate-950">
                      <Play className="h-4 w-4 fill-slate-950" />
                      Quick Watch
                    </button>
                    <button type="button" onClick={() => addMovieToWatchlist(featuredMovie)} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/40 px-6 py-3 text-sm font-semibold text-white hover:border-cyan-400/80 hover:text-cyan-200">
                      <Plus className="h-4 w-4" />
                      Add to Watchlist
                    </button>
                  </div>
                </div>

                <div className="glass-panel w-full max-w-md justify-self-end rounded-[28px] border border-slate-700/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300"><MonitorPlay className="h-3.5 w-3.5" />Available now</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300"><TrendingUp className="h-3.5 w-3.5" />{toDisplayNumber(featuredMovie.rating)} score</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {genres.slice(0, 3).map((genre) => (
                      <div key={genre.genre_id} className="flex items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200">
                        <span>{genre.name}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-cyan-300"><Check className="h-3.5 w-3.5" />Live</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-slate-300">Loading featured movie...</div>
          )}
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {['all', ...genres.map((genre) => genre.genre_id)].map((genreId) => {
                const genre = genreId === 'all' ? { name: 'All' } : genres.find((item) => Number(item.genre_id) === Number(genreId));
                return (
                  <button key={genreId} type="button" onClick={() => setSelectedGenreId(genreId)} className={`rounded-full border px-3.5 py-2 text-sm font-medium ${selectedGenreId === genreId ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200' : 'border-slate-700/80 bg-slate-900/50 text-slate-300 hover:border-cyan-400/60 hover:text-white'}`}>
                    {genre?.name || 'All'}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-slate-300 sm:min-w-[220px]">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search movies" className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none" />
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-slate-200">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent text-sm text-slate-100 outline-none">
                  <option value="rating" className="bg-slate-900 text-slate-100">Top rated</option>
                  <option value="year" className="bg-slate-900 text-slate-100">Newest</option>
                  <option value="name" className="bg-slate-900 text-slate-100">A–Z</option>
                </select>
              </div>
            </div>
          </div>

          {loading.movies ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="skeleton h-[420px] rounded-[28px]" />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {filteredMovies.map((movie) => (
                <div key={movie.movie_id || movie.id} role="button" tabIndex={0} onClick={() => handleMovieOpen(movie.movie_id || movie.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleMovieOpen(movie.movie_id || movie.id); } }} className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-800/80 bg-slate-900/55 text-left shadow-[0_25px_50px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-cyan-400/60">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/5 to-transparent" />
                    <div className="absolute left-3 top-3 inline-flex items-center rounded-full border border-cyan-400/50 bg-slate-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">{movie.genre_name || 'Movie'}</div>
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-xs font-medium text-amber-300"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{toDisplayNumber(movie.rating)}</div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="flex items-center justify-between text-xs text-slate-200">
                        <span>{movie.release_year || 'N/A'}</span>
                        <span>{movie.duration ? `${movie.duration} min` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
                      <span className="rounded-full border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-xs text-cyan-200">{toDisplayNumber(movie.rating)}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-400">{movie.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {route.startsWith('/movie/') && selectedMovie && (
          <section className="mt-8">
            <button type="button" onClick={() => { window.location.hash = '/'; setRoute('/'); }} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to movies
            </button>

            <div className="relative mt-5 overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-950 shadow-[0_30px_80px_rgba(8,15,30,0.8)]">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg, rgba(9,13,22,0.9) 0%, rgba(9,13,22,0.78) 32%, rgba(9,13,22,0.72) 100%), url('${selectedMovie.backdrop_url || selectedMovie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'}')` }} />

              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                  <div className="glass-panel rounded-[28px] border border-slate-700/80 p-3">
                    <img src={selectedMovie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={selectedMovie.title} className="aspect-[3/4] w-full rounded-[22px] object-cover" />
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {genres.slice(0, 3).map((genre) => (
                        <span key={genre.genre_id} className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">{genre.name}</span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{selectedMovie.title}</h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-300"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{toDisplayNumber(selectedMovie.rating)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                      <span>{selectedMovie.release_year || 'N/A'}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-500" />
                      <span>{selectedMovie.duration ? `${selectedMovie.duration} min` : 'Runtime not set'}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-500" />
                      <span>{selectedMovie.language || 'Language N/A'}</span>
                    </div>

                    <p className="max-w-2xl text-base leading-7 text-slate-200/80">{selectedMovie.description}</p>

                    <div className="flex flex-wrap gap-4">
                      <button type="button" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950"><CirclePlay className="h-4 w-4 fill-slate-950" />Quick Watch</button>
                      <button type="button" onClick={() => addMovieToWatchlist(selectedMovie)} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/40 px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400/70 hover:text-cyan-200"><Bookmark className="h-4 w-4" />Add to Watchlist</button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
                      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Reviews</p><p className="mt-2 text-xl font-bold text-white">{reviews.length}</p></div>
                      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Rating</p><p className="mt-2 text-xl font-bold text-cyan-300">{toDisplayNumber(selectedMovie.rating)}</p></div>
                      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Language</p><p className="mt-2 text-xl font-bold text-white">{selectedMovie.language || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">Cast & Crew</h2><Users className="h-5 w-5 text-cyan-300" /></div>
                  {loading.detail ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="skeleton h-44 rounded-2xl" /><div className="skeleton h-44 rounded-2xl" /><div className="skeleton h-44 rounded-2xl" /></div>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {((selectedMovie.cast || []).length ? selectedMovie.cast : [
                        { name: 'Cast not available', role: 'Data pending' },
                        { name: 'Crew not available', role: 'Data pending' },
                      ]).map((person, index) => (
                        <div key={`${person.name}-${index}`} className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3">
                          <div className="h-24 w-full rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20" />
                          <div className="mt-3"><p className="font-semibold text-white">{person.name}</p><p className="text-sm text-slate-400">{person.role || person.character_name || 'Crew member'}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">User Reviews</h2><MessageSquareText className="h-5 w-5 text-cyan-300" /></div>
                  <div className="mt-4 space-y-4">
                    {reviews.length ? reviews.map((review) => (
                      <div key={review.review_id} className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{review.user_name || review.user || 'Viewer'}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Verified viewer</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-300"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{toDisplayNumber(review.rating)}</span>
                            {review.user_id === user?.user_id && (
                              <>
                                <button type="button" onClick={() => updateReview(review)} className="text-xs text-cyan-300">Edit</button>
                                <button type="button" onClick={() => deleteReview(review.review_id)} className="text-xs text-rose-300">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-300">{review.review_text || 'No review text provided.'}</p>
                      </div>
                    )) : <div className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-4 text-slate-300">No reviews yet. Be the first to share feedback.</div>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">Where to Watch</h2><Tv className="h-5 w-5 text-cyan-300" /></div>
                  <div className="mt-4 space-y-3">
                    {(selectedMovie.streaming || []).length ? selectedMovie.streaming.map((platform) => (
                      <div key={platform.platform_id || platform.name} className="flex items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-900/45 px-3 py-3 text-sm text-slate-200">
                        <span>{platform.name}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300"><Check className="h-3.5 w-3.5" />Ready</span>
                      </div>
                    )) : <div className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3 text-slate-300">No platform data available yet.</div> }
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Add Review</h2>
                  <form onSubmit={submitReview} className="mt-4 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">Your rating</span>
                      <input type="number" min="0" max="10" step="0.1" value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white" />
                    </label>
                    <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="Share your thoughts on this movie..." rows="4" className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400/80 focus:outline-none" />
                    <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-slate-950">Submit Review</button>
                  </form>
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">Progress Tracker</h2><span className="text-sm font-semibold text-cyan-300">{watchProgress}%</span></div>
                  <div className="mt-4"><input type="range" min="0" max="100" value={watchProgress} onChange={(event) => setWatchProgress(Number(event.target.value))} className="h-2 w-full accent-cyan-400" /></div>
                  <div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm text-slate-300">Continue Watching</span><button type="button" onClick={saveProgress} className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Save</button></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {!route.startsWith('/movie/') && route !== '/login' && route !== '/register' && route !== '/admin' && (
          <section className="mt-8">
            <div className="glass-panel rounded-[28px] border border-slate-800/80 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950"><UserRound className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Signed in</p>
                    <h2 className="text-xl font-bold text-white">{user?.name || 'Guest User'}</h2>
                  </div>
                </div>
                <button type="button" onClick={handleLogout} className="rounded-full border border-slate-700/80 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400/80 hover:text-white">Log out</button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {dashboardTabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => setDashboardTab(tab)} className={`rounded-full px-4 py-2 text-sm font-medium ${dashboardTab === tab ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'border border-slate-700/80 bg-slate-900/50 text-slate-300 hover:border-cyan-400/70 hover:text-white'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {dashboardTab === 'Profile' && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">My Stats</p>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-4"><p className="text-sm text-slate-400">Movies watched</p><p className="mt-2 text-3xl font-black text-white">{watchHistory.length || 0}</p></div>
                    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-4"><p className="text-sm text-slate-400">Watchlists</p><p className="mt-2 text-3xl font-black text-white">{watchlists.length || 0}</p></div>
                    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-4"><p className="text-sm text-slate-400">Avg. rating</p><p className="mt-2 text-3xl font-black text-amber-300">{movies.length ? toDisplayNumber(movies.reduce((sum, item) => sum + Number(item.rating || 0), 0) / movies.length) : '0.0'}</p></div>
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Favorites</p><span className="inline-flex items-center gap-1 text-xs text-cyan-300"><TrendingUp className="h-3.5 w-3.5" />Live watch data</span></div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {movies.slice(0, 4).map((movie) => (
                      <div key={movie.movie_id || movie.id} className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/45">
                        <img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="h-36 w-full object-cover" />
                        <div className="p-3"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-white">{movie.title}</p><span className="inline-flex items-center gap-1 text-xs text-amber-300"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{toDisplayNumber(movie.rating)}</span></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === 'Watchlists' && (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {loading.watchlists ? <div className="skeleton h-48 rounded-[28px]" /> : watchlists.length ? watchlists.map((list) => (
                  <div key={list.watchlist_id} className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-white">{list.name}</h3>
                        <p className="text-sm text-slate-400">{list.movie_count || list.movies?.length || 0} titles</p>
                      </div>
                      <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/80 hover:text-white"><Share2 className="h-4 w-4" />Share</button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {(list.movies || []).slice(0, 3).map((movie) => (
                        <div key={`${list.watchlist_id}-${movie.movie_id || movie.id}`} className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/45">
                          <img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="h-28 w-full object-cover" />
                          <p className="p-2 text-xs font-medium text-slate-200">{movie.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5 text-slate-300">No watchlists yet. Create one from any movie card.</div>}
              </div>
            )}

            {dashboardTab === 'History' && (
              <div className="mt-6 grid gap-4">
                {loading.history ? <div className="skeleton h-28 rounded-[28px]" /> : watchHistory.length ? watchHistory.map((item) => (
                  <div key={item.history_id} className="glass-panel rounded-[28px] border border-slate-800/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="text-sm text-slate-400">{item.watched_at ? new Date(item.watched_at).toLocaleString() : 'Recently watched'}</p>
                      </div>
                      <span className="text-sm font-semibold text-cyan-300">{item.progress ?? 0}%</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${item.progress ?? 0}%` }} /></div>
                  </div>
                )) : <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5 text-slate-300">No watch history yet. Start watching to build your history.</div>}
              </div>
            )}

            {dashboardTab === 'Friends' && (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Add a friend</h2>
                  <form onSubmit={sendFriendRequest} className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input type="email" value={friendEmail} onChange={(event) => setFriendEmail(event.target.value)} placeholder="Friend's email" className="min-w-0 flex-1 rounded-2xl border border-slate-700/80 bg-slate-900/45 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400/80 focus:outline-none" />
                    <button type="submit" className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950">Send request</button>
                  </form>
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Pending requests received</h2>
                  <div className="mt-4 space-y-3">
                    {loading.friends ? <div className="skeleton h-16 rounded-2xl" /> : pendingRequests.length ? pendingRequests.map((request) => (
                      <div key={request.friendship_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3">
                        <div><p className="font-semibold text-white">{request.sender_name}</p><p className="text-sm text-slate-400">{request.sender_email}</p></div>
                        <div className="flex gap-2"><button type="button" onClick={() => respondToFriendRequest(request.friendship_id, 'accepted')} className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200">Accept</button><button type="button" onClick={() => respondToFriendRequest(request.friendship_id, 'rejected')} className="rounded-full border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">Reject</button></div>
                      </div>
                    )) : <p className="text-sm text-slate-400">No pending requests.</p>}
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Your friends</h2>
                  <div className="mt-4 space-y-3">
                    {loading.friends ? <div className="skeleton h-16 rounded-2xl" /> : friends.length ? friends.map((friend) => (
                      <div key={friend.friendship_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3">
                        <div><p className="font-semibold text-white">{friend.name}</p><p className="text-sm text-slate-400">{friend.email}</p></div>
                        <button type="button" onClick={() => removeFriend(friend.friendship_id)} className="rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400/70 hover:text-rose-200">Remove</button>
                      </div>
                    )) : <p className="text-sm text-slate-400">No friends yet. Send a request to connect.</p>}
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Sent requests</h2>
                  <div className="mt-4 space-y-3">
                    {loading.friends ? <div className="skeleton h-16 rounded-2xl" /> : sentRequests.length ? sentRequests.map((request) => (
                      <div key={request.friendship_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3">
                        <div><p className="font-semibold text-white">{request.recipient_name}</p><p className="text-sm text-slate-400">{request.recipient_email}</p></div>
                        <button type="button" onClick={() => removeFriend(request.friendship_id)} className="rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400/70 hover:text-rose-200">Cancel</button>
                      </div>
                    )) : <p className="text-sm text-slate-400">No sent requests.</p>}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.18),transparent_25%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <header className="glass-panel sticky top-4 z-30 flex items-center gap-3 rounded-2xl border border-slate-800/80 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/20"><Film className="h-5 w-5" /></div>
            <p className="text-lg font-semibold tracking-tight text-white">Cineverse</p>
          </div>

          {token && (
            <div className="hidden min-w-[220px] items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-slate-300 md:flex lg:min-w-[300px]">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search titles, genres..." className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none" />
            </div>
          )}

          {token && (
            <div className="hidden items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2.5 py-2 text-slate-200 lg:flex">
              <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
              <select value={selectedGenreId} onChange={(event) => setSelectedGenreId(event.target.value)} className="bg-transparent pr-1 text-sm text-slate-100 outline-none">
                <option value="all" className="bg-slate-900 text-slate-100">All</option>
                {genres.map((genre) => (
                  <option key={genre.genre_id} value={genre.genre_id} className="bg-slate-900 text-slate-100">{genre.name}</option>
                ))}
              </select>
            </div>
          )}

          {token && (
            <nav className="hidden items-center gap-6 text-sm text-slate-300 xl:flex">
              <button type="button" onClick={() => { window.location.hash = '/'; setRoute('/'); }} className="transition hover:text-white">Home</button>
              <button type="button" onClick={() => { if (user?.role === 'admin') { window.location.hash = '/admin'; setRoute('/admin'); } else { window.location.hash = '/'; setRoute('/'); } }} className="transition hover:text-white">Dashboard</button>
              <button type="button" className="transition hover:text-white">Trending</button>
            </nav>
          )}

          {token && (
            <div className="ml-auto hidden items-center gap-3 md:flex">
              <button type="button" onClick={() => { setDashboardTab('Watchlists'); window.location.hash = '/'; setRoute('/'); }} className="rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/80 hover:text-white">Watchlist</button>
              <button type="button" onClick={() => { setDashboardTab('History'); window.location.hash = '/'; setRoute('/'); }} className="rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/80 hover:text-white">History</button>
              <button type="button" onClick={() => { setDashboardTab('Friends'); window.location.hash = '/'; setRoute('/'); }} className="rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/80 hover:text-white">Friends</button>
              <button type="button" onClick={() => { setDashboardTab('Profile'); window.location.hash = '/'; setRoute('/'); }} className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white"><UserRound className="h-4 w-4" />{user ? user.name : 'Profile'}</button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button type="button" className="rounded-full border border-slate-700/80 bg-slate-900/40 p-2 text-slate-200 transition hover:border-cyan-400/70 hover:text-white"><Bell className="h-4 w-4" /></button>
            {token ? (
              <button type="button" onClick={handleLogout} className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20">Logout</button>
            ) : (
              <button type="button" onClick={() => { window.location.hash = '/login'; setRoute('/login'); }} className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20">{authButtonLabel}</button>
            )}
            {!token && (
              <button type="button" onClick={() => { window.location.hash = '/register'; setRoute('/register'); }} className="hidden rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 sm:inline-flex">Sign up</button>
            )}
          </div>
        </header>

        {renderRoute()}
      </div>

      {toast && (
        <div className={`fixed right-5 top-24 z-50 rounded-full border px-4 py-2 text-sm shadow-lg ${toast.type === 'error' ? 'border-rose-400/50 bg-rose-500/15 text-rose-100' : 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;