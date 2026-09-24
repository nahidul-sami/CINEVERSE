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
  Menu,
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
  userApi,
  reviewApi,
  personApi,
  watchHistoryApi,
  watchlistApi,
  friendshipApi,
  notificationApi,
  streamingPlatformApi,
} from './api/api';
import Landing from './components/Landing';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import SearchPage from './pages/SearchPage';
import PersonDetail from './components/PersonDetail';

const dashboardTabs = ['Profile', 'History', 'Friends'];
const adminTabs = ['Manage Movies', 'Manage Genres', 'Streaming Platforms', 'Cast & Crew Assignment'];

const getHashRoute = () => {
  const path = window.location.hash.replace(/^#/, '') || '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const toDisplayNumber = (value) => Number(value ?? 0).toFixed(1);

const normalizeImage = (value) => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;
  return `http://localhost:5000${value.startsWith('/') ? value : `/${value}`}`;
};

const timeAgo = (dateString) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
};

const spoilerPatterns = [
  /\bspoiler\b/i,
  /\bplot twist\b/i,
  /\bmajor twist\b/i,
  /\bfinal reveal\b/i,
  /\bending reveal\b/i,
  /\b(?:big|major|final|ending|surprise)\s+reveal\b/i,
  /\bat the end\b/i,
  /\bin the final scene\b/i,
  /\b(?:[a-z]+)\s+(?:dies?|gets killed|is actually|turns out to be|was the killer|was the villain)\s+(?:in|during|at|before)\b/i,
  /\b(?:dies?|gets killed|is actually|turns out to be|was the killer|was the villain)\s+(?:in|during|at|before)\s+(?:this|the)\s+(?:movie|film|show|series|episode)\b/i,
  /\b(?:he|she|they|it|rengoku|zenitsu|tanjiro|naruto|goku|madara|luffy|spiderman|batman|wonder woman|iron man|the villain|the killer|the hero|the main character|the protagonist|the character)\s+(?:dies?|gets killed|is actually|turns out to be|was the killer|was the villain)\b/i,
  /\b(?:the villain|the killer|the hero|the main character|the mc|the protagonist|the character)\s+(?:was|is)\b/i,
  /\breveal(?:s|ed)?\s+(?:that|who)\b/i,
  /\b(?:killer|villain|traitor|murderer)\s+(?:is|was)\b/i,
  /\b(?:rengoku|zenitsu|tanjiro|naruto|goku|madara|luffy|spiderman|batman|wonder woman|iron man)\s+(?:dies?|gets killed)\b/i,
];

const containsSpoilerText = (text) => {
  if (typeof text !== 'string') return false;
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized) return false;
  return spoilerPatterns.some((pattern) => pattern.test(normalized));
};

const getVisibleReviewText = (review) => {
  const rawText = review?.review_text || 'No review text provided.';
  if (review?.is_spoiler || containsSpoilerText(rawText)) {
    return 'This review contains spoilers and is hidden for safety.';
  }
  return rawText;
};

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
  const [profileName, setProfileName] = useState('');
  const [movies, setMovies] = useState([]);
  const [adminMovies, setAdminMovies] = useState([]);
  const [adminSearchResults, setAdminSearchResults] = useState(null);
  const [adminMovieLoading, setAdminMovieLoading] = useState(false);
  const [debouncedAdminMovieSearch, setDebouncedAdminMovieSearch] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [genres, setGenres] = useState([]);
  const [movieDetail, setMovieDetail] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [sharedWatchlists, setSharedWatchlists] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [selectedGenreId, setSelectedGenreId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [personSuggestions, setPersonSuggestions] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [deleteReviewId, setDeleteReviewId] = useState(null);
  const [reviewSort, setReviewSort] = useState('recent');
  const [watchProgress, setWatchProgress] = useState(0);
  const [dashboardTab, setDashboardTab] = useState('Profile');
  const [activeNav, setActiveNav] = useState('Home');
  const [adminTab, setAdminTab] = useState('Manage Movies');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState({ movies: false, detail: false, profile: false, history: false, watchlists: false, friends: false, page: true });
  const [friendEmail, setFriendEmail] = useState('');
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [sharePickerId, setSharePickerId] = useState(null);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [watchlistDetailLoading, setWatchlistDetailLoading] = useState(false);
  const [addingMovieId, setAddingMovieId] = useState(null);
  const [watchlistPickerMovie, setWatchlistPickerMovie] = useState(null);
  const [watchlistPickerLoading, setWatchlistPickerLoading] = useState(false);
  const [watchlistSaving, setWatchlistSaving] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [movieForm, setMovieForm] = useState({ title: '', description: '', release_year: '', duration: '', language: '', rating: '', poster_url: '', backdrop_url: '', trailer_url: '' });
  const [genreForm, setGenreForm] = useState({ name: '', description: '' });
  const [editingGenreId, setEditingGenreId] = useState(null);
  const [editingGenreForm, setEditingGenreForm] = useState({ name: '', description: '' });
  const [deleteGenreId, setDeleteGenreId] = useState(null);
  const [personForm, setPersonForm] = useState({ name: '', birth_date: '', biography: '', profile_url: '', person_type: 'actor' });
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [platformForm, setPlatformForm] = useState({ name: '', logo_url: '', country: '', url: '', subscription_type: '' });
  const [creditForm, setCreditForm] = useState({ name: '', person_type: 'actor', character_name: '', movie_id: '' });
  const [movieSearch, setMovieSearch] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [movieModalOpen, setMovieModalOpen] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movieSubmitting, setMovieSubmitting] = useState(false);
  const [deleteMovieId, setDeleteMovieId] = useState(null);
  const [assignMovie, setAssignMovie] = useState(null);
  const [associationMovie, setAssociationMovie] = useState(null);
  const [associationGenreId, setAssociationGenreId] = useState('');
  const [associationPlatformId, setAssociationPlatformId] = useState('');
  const [associationPlatformUrl, setAssociationPlatformUrl] = useState('');
  const [people, setPeople] = useState([]);
  const [personSearch, setPersonSearch] = useState('');
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [selectedAdminPerson, setSelectedAdminPerson] = useState(null);
  const [adminPersonLoading, setAdminPersonLoading] = useState(false);
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const toastTimer = useRef(null);
  const notificationMenuRef = useRef(null);
  const searchMenuRef = useRef(null);
  const friendSearchRef = useRef(null);
  const dashboardSectionRef = useRef(null);
  const lastScrollY = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationApi.getAll();
      setNotifications(response.data?.notifications || []);
      setUnreadCount(Number(response.data?.unread_count || 0));
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not load notifications', 'error');
    }
  }, [showToast]);

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
    setNotifications([]);
    setUnreadCount(0);
    setNotificationsOpen(false);
    setRoute('/');
    window.location.hash = '/';
  }, []);

  useEffect(() => {
    const handleHashChange = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleSearchOutside = (event) => {
      if (searchMenuRef.current && !searchMenuRef.current.contains(event.target)) setSearchOpen(false);
    };
    const handleSearchEscape = (event) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleSearchOutside);
    document.addEventListener('keydown', handleSearchEscape);
    return () => {
      document.removeEventListener('mousedown', handleSearchOutside);
      document.removeEventListener('keydown', handleSearchEscape);
    };
  }, []);

  useEffect(() => {
    if (getHashRoute() !== route) {
      window.location.hash = route;
    }
  }, [route]);

  useEffect(() => {
    window.setTimeout(() => setSearchOpen(false), 0);
    if (route.startsWith('/movie/')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [route]);

  useEffect(() => {
    if (!token || route !== '/profile') return undefined;

    let ignore = false;
    userApi.getProfile()
      .then(({ data }) => {
        if (!ignore) setProfileData(data || null);
      })
      .catch(() => {
        if (!ignore) setProfileData(null);
      });

    return () => {
      ignore = true;
    };
  }, [token, route]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchTerm), 150);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      setPersonSuggestions([]);
      return undefined;
    }
    let ignore = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await personApi.search({ q: query, limit: 6 });
        if (!ignore) setPersonSuggestions(response.data?.persons || []);
      } catch {
        if (!ignore) setPersonSuggestions([]);
      }
    }, 180);
    return () => { ignore = true; window.clearTimeout(timeout); };
  }, [searchTerm]);

  useEffect(() => {
    const query = friendEmail.trim();
    if (query.length < 2 || selectedFriend) {
      return undefined;
    }

    let ignore = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await userApi.search({ q: query, limit: 6 });
        if (!ignore) setFriendSuggestions((response.data?.users || []).filter((candidate) => Number(candidate.user_id) !== Number(user?.user_id)));
      } catch {
        if (!ignore) setFriendSuggestions([]);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [friendEmail, selectedFriend, user?.user_id]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;
      const pastThreshold = currentScrollY > 80;

      setHeaderVisible(!scrollingDown || !pastThreshold);
      if (scrollingDown && pastThreshold) {
        setNotificationsOpen(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (token) {
      authApi.profile()
        .then(({ data }) => {
          const profileUser = data?.user || data;
          setUser(profileUser);
          setProfileName(profileUser.name || '');
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
    if (!token) return undefined;

    window.setTimeout(fetchNotifications, 0);
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (friendSearchRef.current && !friendSearchRef.current.contains(event.target)) {
        setFriendSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const isPublicRoute = route === '/' || route === '/login' || route === '/register';
    const autoRoute = !token && !isPublicRoute
      ? '/login'
      : route === '/admin' && user?.role !== 'admin'
        ? '/login'
        : user?.role === 'admin' && ['/watchlists', '/history', '/friends'].includes(route)
          ? '/admin'
        : route === '/' && user?.role === 'admin'
          ? '/admin'
          : route;
    if (autoRoute !== route) {
      window.location.hash = autoRoute;
    }
  }, [route, token, user]);

  useEffect(() => {
    if (!token || !user || user.role === 'admin') {
      if (user?.role === 'admin') {
        setFriends([]);
        setPendingRequests([]);
        setSentRequests([]);
        setWatchlists([]);
        setSharedWatchlists([]);
      }
      return undefined;
    }

    const loadDashboardData = async () => {
      setLoading((prev) => ({ ...prev, history: true, watchlists: true, friends: true }));
      try {
        const [historyRes, listRes, friendsRes, pendingRes, sentRes, sharedRes] = await Promise.all([
          watchHistoryApi.getAll(),
          watchlistApi.getAll(),
          friendshipApi.getFriends(),
          friendshipApi.getPending(),
          friendshipApi.getSent(),
          watchlistApi.getSharedWithMe(),
        ]);
        setWatchHistory(historyRes.data?.history || []);
        setWatchlists(listRes.data?.watchlists || []);
        setFriends(friendsRes.data?.friends || []);
        setPendingRequests(pendingRes.data?.requests || []);
        setSentRequests(sentRes.data?.requests || []);
        setSharedWatchlists(sharedRes.data?.shared_watchlists || []);
      } catch (error) {
        showToast(error?.response?.data?.message || 'Could not load dashboard data', 'error');
      } finally {
        setLoading((prev) => ({ ...prev, history: false, watchlists: false, friends: false }));
      }
    };

    loadDashboardData();
  }, [token, user, showToast]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    movieApi.recommendations({ limit: 8 })
      .then((response) => setRecommendations(response.data?.recommendations || []))
      .catch(() => setRecommendations([]));
    return undefined;
  }, [token]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const response = await genreApi.getAll();
        setGenres(response.data || []);
      } catch (error) {
        showToast(error?.response?.data?.message || 'Failed to load genres', 'error');
      }
    };

    let ignore = false;
    const loadMovies = async () => {
      setLoading((prev) => ({ ...prev, movies: true, page: false }));
      try {
        const params = {};
        if (selectedGenreId !== 'all') params.genre_id = selectedGenreId;
        if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
        params.limit = 100;
        const response = debouncedSearch.trim()
          ? await movieApi.search({ q: debouncedSearch.trim(), page: 1, limit: 100 })
          : await movieApi.getAll(params);
        if (!ignore) setMovies(debouncedSearch.trim() ? (response.data?.results || []) : (response.data || []));
      } catch (error) {
        if (!ignore) {
          showToast(error?.response?.data?.message || 'Failed to load movies', 'error');
          setMovies([]);
        }
      } finally {
        if (!ignore) setLoading((prev) => ({ ...prev, movies: false }));
      }
    };

    loadGenres();
    loadMovies();
    return () => { ignore = true; };
  }, [selectedGenreId, debouncedSearch, showToast]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedAdminMovieSearch(movieSearch), 180);
    return () => window.clearTimeout(timeout);
  }, [movieSearch]);

  useEffect(() => {
    if (route !== '/admin' || adminTab !== 'Manage Movies') return undefined;
    let ignore = false;
    const loadAdminMovies = async () => {
      setAdminMovieLoading(true);
      try {
        const query = debouncedAdminMovieSearch.trim();
        if (query && adminMovies.length > 0) {
          const localMatches = adminMovies.filter((movie) => (movie.title || '').toLowerCase().includes(query.toLowerCase()));
          if (localMatches.length > 0) {
            if (!ignore) setAdminSearchResults(localMatches);
            return;
          }
        }

        if (!query && adminMovies.length > 0) {
          if (!ignore) setAdminSearchResults(null);
          return;
        }

        const response = query
          ? await movieApi.search({ q: query, page: 1, limit: 100 })
          : await movieApi.getAll({ limit: 200 });
        if (!ignore) {
          if (query) setAdminSearchResults(response.data?.results || []);
          else setAdminMovies(response.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setAdminMovies([]);
          showToast(error?.response?.data?.message || 'Could not load admin movies', 'error');
        }
      } finally {
        if (!ignore) setAdminMovieLoading(false);
      }
    };
    loadAdminMovies();
    return () => { ignore = true; };
  }, [adminMovies, adminTab, debouncedAdminMovieSearch, route, showToast]);

  useEffect(() => {
    if (route !== '/admin' || adminTab !== 'Cast & Crew Assignment') return undefined;
    let ignore = false;
    setPeopleLoading(true);
    personApi.getAll()
      .then((response) => {
        if (!ignore) setPeople(response.data || []);
      })
      .catch((error) => {
        if (!ignore) showToast(error?.response?.data?.message || 'Could not load people', 'error');
      })
      .finally(() => {
        if (!ignore) setPeopleLoading(false);
      });
    return () => { ignore = true; };
  }, [adminTab, route, showToast]);

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
        const payload = detailResponse.data || {};
        const movie = payload.movie
          ? { ...payload.movie, genres: payload.genres || [], cast: payload.cast || [], streaming: payload.streaming || [], images: payload.images || [] }
          : null;
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

  useEffect(() => {
    if (route.startsWith('/person/')) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route]);

  useEffect(() => {
    if (!route.startsWith('/movie/')) return;
    const movieId = Number(route.match(/^\/movie\/(\d+)$/)?.[1]);
    const historyItem = watchHistory.find((item) => Number(item.movie_id) === movieId);
    if (historyItem) window.setTimeout(() => setWatchProgress(Number(historyItem.progress) || 0), 0);
  }, [route, watchHistory]);

  const filteredMovies = useMemo(() => {
    const list = [...movies];

    return list.sort((a, b) => {
        if (sortBy === 'year') return Number(b.release_year || 0) - Number(a.release_year || 0);
        if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
        return Number(b.rating || 0) - Number(a.rating || 0);
      });
  }, [movies, sortBy]);

  const visiblePeople = useMemo(() => {
    const query = personSearch.trim().toLowerCase();
    if (!query) return people;
    return people.filter((person) => `${person.name || ''} ${person.person_type || ''}`.toLowerCase().includes(query));
  }, [people, personSearch]);

  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return [
      ...filteredMovies.slice(0, 4).map((movie) => ({ ...movie, suggestionType: 'movie' })),
      ...personSuggestions.slice(0, 4).map((person) => ({ ...person, suggestionType: 'person' })),
    ];
  }, [filteredMovies, personSuggestions, searchTerm]);

  const featuredMovie = filteredMovies[0] || movieDetail || movies[0] || null;

  const selectedMovie = movieDetail || (filteredMovies[0] ?? null);

  const sortedReviews = useMemo(() => [...reviews].sort((a, b) => {
    if (reviewSort === 'highest') return Number(b.rating) - Number(a.rating);
    if (reviewSort === 'lowest') return Number(a.rating) - Number(b.rating);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [reviews, reviewSort]);

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

  const handlePersonOpen = (person) => {
    const nextRoute = person?.tmdb_id ? `/person/tmdb/${person.tmdb_id}` : `/person/${person.person_id}`;
    setSearchOpen(false);
    setRoute(nextRoute);
  };

  const openGallery = (index) => setGalleryIndex(index);
  const closeGallery = () => setGalleryIndex(null);
  const nextGalleryImage = () => setGalleryIndex((index) => (index + 1) % selectedMovie.images.length);
  const prevGalleryImage = () => setGalleryIndex((index) => (index - 1 + selectedMovie.images.length) % selectedMovie.images.length);

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

    const spoilerPatterns = [
      /\bspoiler\b/i,
      /\bplot twist\b/i,
      /\bmajor twist\b/i,
      /\bfinal reveal\b/i,
      /\bending reveal\b/i,
      /\bat the end\b/i,
      /\bin the final scene\b/i,
      /\b(?:he|she|they)\s+(?:dies?|gets killed|is actually|turns out to be)\b/i,
      /\b(?:the villain|the killer|the hero|the main character)\s+(?:was|is)\b/i,
      /\breveal(?:s|ed)?\s+(?:that|who)\b/i,
      /\b(?:killer|villain|traitor|murderer)\s+(?:is|was)\b/i,
    ];

    if (containsSpoilerText(reviewText)) {
      showToast('Spoiler reviews are not allowed. Please keep the ending and major plot twists out of your review.', 'error');
      return;
    }

    try {
      const payload = {
        rating: Number(reviewRating),
        review_text: reviewText,
      };
      const existingReview = reviews.find((review) => Number(review.user_id) === Number(user?.user_id));
      if (existingReview) {
        await reviewApi.update(existingReview.review_id, payload);
      } else {
        await reviewApi.create({ movie_id: movieDetail.movie_id, ...payload });
      }
      setReviewText('');
      setReviewRating(5);
      const refreshed = await reviewApi.listByMovie(movieDetail.movie_id);
      setReviews(refreshed.data?.reviews || []);
      showToast(existingReview ? 'Review updated' : 'Review submitted');
    } catch (error) {
      showToast(error?.response?.data?.message || error?.response?.data?.error || 'Review submission failed', 'error');
    }
  };

  const beginReviewEdit = (review) => {
    setEditingReviewId(review.review_id);
    setEditReviewText(review.review_text || '');
    setEditReviewRating(Number(review.rating) || 5);
    setEditHoverRating(0);
    setDeleteReviewId(null);
  };

  const saveReviewEdit = async () => {
    if (!editReviewText.trim()) {
      showToast('Please enter a review before saving', 'error');
      return;
    }

    const spoilerPatterns = [
      /\bspoiler\b/i,
      /\bplot twist\b/i,
      /\bmajor twist\b/i,
      /\bfinal reveal\b/i,
      /\bending reveal\b/i,
      /\bat the end\b/i,
      /\bin the final scene\b/i,
      /\b(?:he|she|they)\s+(?:dies?|gets killed|is actually|turns out to be)\b/i,
      /\b(?:the villain|the killer|the hero|the main character)\s+(?:was|is)\b/i,
      /\breveal(?:s|ed)?\s+(?:that|who)\b/i,
      /\b(?:killer|villain|traitor|murderer)\s+(?:is|was)\b/i,
    ];

    if (containsSpoilerText(editReviewText)) {
      showToast('Spoiler reviews are not allowed. Please keep the ending and major plot twists out of your review.', 'error');
      return;
    }

    try {
      await reviewApi.update(editingReviewId, {
        rating: Number(editReviewRating),
        review_text: editReviewText,
      });
      const refreshed = await reviewApi.listByMovie(movieDetail.movie_id);
      setReviews(refreshed.data?.reviews || []);
      setEditingReviewId(null);
      showToast('Review updated');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Review update failed', 'error');
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await reviewApi.remove(reviewId);
      const refreshed = await reviewApi.listByMovie(movieDetail.movie_id);
      setReviews(refreshed.data?.reviews || []);
      setDeleteReviewId(null);
      showToast('Review removed');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Review deletion failed', 'error');
    }
  };

  const shareWatchlist = async (watchlistId, friend) => {
    try {
      await watchlistApi.share(watchlistId, { shared_with: friend.user_id });
      setSharePickerId(null);
      showToast(`Shared with ${friend.name}`);
      fetchNotifications();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not share watchlist', 'error');
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await notificationApi.markRead(notification.notification_id);
        setNotifications((current) => current.map((item) => item.notification_id === notification.notification_id ? { ...item, is_read: true } : item));
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (error) {
        showToast(error?.response?.data?.message || 'Could not mark notification as read', 'error');
      }
    }

    setNotificationsOpen(false);
    if (notification.notification_type === 'watchlist_share') {
      setActiveNav('Watchlist');
      setRoute('/watchlists');
      return;
    }

    setDashboardTab('Friends');
    setRoute('/');
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not mark notifications as read', 'error');
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

  const markAsWatched = async () => {
    if (!token || !movieDetail) {
      showToast('Sign in to mark movies as watched', 'error');
      return;
    }
    try {
      await watchHistoryApi.add({ movie_id: movieDetail.movie_id, progress: 100 });
      const response = await watchHistoryApi.getAll();
      setWatchHistory(response.data?.history || []);
      setWatchProgress(100);
      showToast('Marked as watched');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Unable to mark movie as watched', 'error');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationApi.remove(notificationId);
      setNotifications((current) => current.filter((item) => item.notification_id !== notificationId));
      showToast('Notification deleted');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not delete notification', 'error');
    }
  };

  const addMovieToWatchlist = async (movie) => {
    if (!token) {
      showToast('Sign in to use watchlists', 'error');
      return;
    }

    setWatchlistPickerMovie(movie);
    setNewWatchlistName('');
    setWatchlistPickerLoading(true);
    try {
      const currentWatchlists = await watchlistApi.getAll();
      setWatchlists(currentWatchlists.data?.watchlists || []);
    } catch (error) {
      setWatchlistPickerMovie(null);
      showToast(error?.response?.data?.message || 'Could not load watchlists', 'error');
    } finally {
      setWatchlistPickerLoading(false);
    }
  };

  const saveMovieToWatchlist = async (watchlistId) => {
    if (!watchlistPickerMovie) return;
    const movieId = watchlistPickerMovie.movie_id || watchlistPickerMovie.id || watchlistPickerMovie.movieId;
    setAddingMovieId(movieId);
    setWatchlistSaving(true);
    try {
      let targetWatchlistId = watchlistId;
      if (!targetWatchlistId) {
        if (!newWatchlistName.trim()) {
          showToast('Enter a name for the new watchlist', 'error');
          return;
        }
        const created = await watchlistApi.create({ name: newWatchlistName.trim() });
        targetWatchlistId = created.data?.watchlist?.watchlist_id;
      }

      await watchlistApi.addMovie(targetWatchlistId, { movie_id: movieId });
      const refreshed = await watchlistApi.getAll();
      setWatchlists(refreshed.data?.watchlists || []);
      setWatchlistPickerMovie(null);
      showToast('Added to watchlist');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not add movie to watchlist', 'error');
    } finally {
      setAddingMovieId(null);
      setWatchlistSaving(false);
    }
  };

  const openWatchlist = async (watchlistId) => {
    setWatchlistDetailLoading(true);
    try {
      const response = await watchlistApi.getById(watchlistId);
      setSelectedWatchlist(response.data?.watchlist || response.data);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not load watchlist', 'error');
    } finally {
      setWatchlistDetailLoading(false);
    }
  };

  const createWatchlist = async () => {
    const name = window.prompt('Watchlist name');
    if (!name?.trim()) return;

    try {
      const response = await watchlistApi.create({ name: name.trim() });
      const refreshed = await watchlistApi.getAll();
      setWatchlists(refreshed.data?.watchlists || []);
      showToast(`Created ${response.data?.watchlist?.name || name.trim()}`);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not create watchlist', 'error');
    }
  };

  const renameWatchlist = async (list) => {
    const name = window.prompt('Watchlist name', list.name);
    if (!name?.trim() || name.trim() === list.name) return;
    try {
      await watchlistApi.update(list.watchlist_id, { name: name.trim() });
      const refreshed = await watchlistApi.getAll();
      setWatchlists(refreshed.data?.watchlists || []);
      showToast('Watchlist renamed');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not rename watchlist', 'error');
    }
  };

  const deleteWatchlist = async (watchlistId) => {
    if (!window.confirm('Delete this watchlist?')) return;
    try {
      await watchlistApi.remove(watchlistId);
      setWatchlists((current) => current.filter((list) => list.watchlist_id !== watchlistId));
      showToast('Watchlist deleted');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not delete watchlist', 'error');
    }
  };

  const deleteHistoryItem = async (historyId) => {
    try {
      await watchHistoryApi.remove(historyId);
      setWatchHistory((current) => current.filter((item) => item.history_id !== historyId));
      showToast('History item removed');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not remove history item', 'error');
    }
  };

  const loadPlatforms = async () => {
    try {
      const response = await streamingPlatformApi.getAll();
      setPlatforms(response.data?.platforms || []);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not load platforms', 'error');
    }
  };

  const createPlatform = async (event) => {
    event.preventDefault();
    try {
      await streamingPlatformApi.create(platformForm);
      setPlatformForm({ name: '', logo_url: '', country: '', url: '', subscription_type: '' });
      await loadPlatforms();
      showToast('Platform created');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not create platform', 'error');
    }
  };

  const deletePlatform = async (platformId) => {
    if (!window.confirm('Delete this platform?')) return;
    try {
      await streamingPlatformApi.remove(platformId);
      setPlatforms((current) => current.filter((platform) => platform.platform_id !== platformId));
      showToast('Platform deleted');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not delete platform', 'error');
    }
  };

  const editPlatform = async (platform) => {
    const name = window.prompt('Platform name', platform.name);
    if (!name?.trim() || name.trim() === platform.name) return;
    try {
      await streamingPlatformApi.update(platform.platform_id, { ...platform, name: name.trim() });
      await loadPlatforms();
      showToast('Platform updated');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not update platform', 'error');
    }
  };

  const addMovieImage = async () => {
    if (!movieDetail || !imageUrl.trim()) return;
    try {
      await movieApi.addImage(movieDetail.movie_id, { image_url: imageUrl.trim(), image_type: 'gallery' });
      const response = await movieApi.getById(movieDetail.movie_id);
      setMovieDetail({ ...response.data.movie, genres: response.data.genres || [], cast: response.data.cast || [], streaming: response.data.streaming || [], images: response.data.images || [] });
      setImageUrl('');
      showToast('Image added');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not add image', 'error');
    }
  };

  const removeMovieImage = async (imageId) => {
    try {
      await movieApi.removeImage(movieDetail.movie_id, imageId);
      setMovieDetail((current) => ({ ...current, images: current.images.filter((image) => image.image_id !== imageId) }));
      showToast('Image removed');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not remove image', 'error');
    }
  };

  const removeMovieFromWatchlist = async (watchlistId, movieId) => {
    try {
      await watchlistApi.removeMovie(watchlistId, movieId);
      await openWatchlist(watchlistId);
      const refreshed = await watchlistApi.getAll();
      setWatchlists(refreshed.data?.watchlists || []);
      showToast('Movie removed from watchlist');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not remove movie', 'error');
    }
  };

  const sendFriendRequest = async (event) => {
    event.preventDefault();
    if (!selectedFriend) {
      showToast('Choose a person from the suggestions', 'error');
      return;
    }

    try {
      await friendshipApi.sendRequest({ friend_id: selectedFriend.user_id });
      setFriendEmail('');
      setSelectedFriend(null);
      setFriendSuggestions([]);
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
      const payload = {
        title: movieForm.title,
        description: movieForm.description,
        release_year: movieForm.release_year ? Number(movieForm.release_year) : null,
        duration: movieForm.duration ? Number(movieForm.duration) : null,
        language: movieForm.language,
        rating: movieForm.rating ? Number(movieForm.rating) : null,
        poster_url: movieForm.poster_url,
        backdrop_url: movieForm.backdrop_url,
        trailer_url: movieForm.trailer_url,
      };
      if (editingMovieId) await movieApi.update(editingMovieId, payload);
      else await movieApi.create(payload);
      setMovieForm({ title: '', description: '', release_year: '', duration: '', language: '', rating: '', poster_url: '', backdrop_url: '', trailer_url: '' });
      setEditingMovieId(null);
      const response = await movieApi.getAll();
      setMovies(response.data || []);
      setAdminMovies(response.data || []);
      setAdminSearchResults(null);
      setMovieModalOpen(false);
      showToast(editingMovieId ? 'Movie updated successfully' : 'Movie created successfully');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Movie creation failed', 'error');
    } finally {
      setMovieSubmitting(false);
    }
  };

  const editMovie = (movie) => {
    setEditingMovieId(movie.movie_id);
    setMovieForm({ title: movie.title || '', description: movie.description || '', release_year: movie.release_year || '', duration: movie.duration || '', language: movie.language || '', rating: movie.rating || '', poster_url: movie.poster_url || '', backdrop_url: movie.backdrop_url || '', trailer_url: movie.trailer_url || '' });
    setMovieModalOpen(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const response = await authApi.updateProfile({ name: profileName });
      setUser(response.data?.user || user);
      localStorage.setItem('cineverse_user', JSON.stringify(response.data?.user || user));
      showToast('Profile updated');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not update profile', 'error');
    }
  };

  const deleteMovie = async () => {
    try {
      await movieApi.remove(deleteMovieId);
      setMovies((current) => current.filter((movie) => Number(movie.movie_id) !== Number(deleteMovieId)));
      setAdminMovies((current) => current.filter((movie) => Number(movie.movie_id) !== Number(deleteMovieId)));
      setAdminSearchResults((current) => current?.filter((movie) => Number(movie.movie_id) !== Number(deleteMovieId)) || null);
      if (Number(movieDetail?.movie_id) === Number(deleteMovieId)) {
        const nextRoute = user?.role === 'admin' ? '/admin' : '/';
        setMovieDetail(null);
        setRoute(nextRoute);
        window.location.hash = nextRoute;
      }
      setDeleteMovieId(null);
      showToast('Movie deleted successfully');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Movie deletion failed', 'error');
    }
  };

  const openAssignModal = async (movie) => {
    setAssignMovie({ ...movie, cast: [] });
    setCreditForm((current) => ({ ...current, movie_id: movie.movie_id, person_type: 'actor', character_name: '' }));
    try {
      const [peopleResponse, movieResponse] = await Promise.all([
        personApi.getAll(),
        movieApi.getById(movie.movie_id),
      ]);
      setPeople(peopleResponse.data || []);
      setAssignMovie((current) => ({ ...current, cast: movieResponse.data?.cast || [] }));
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not load people', 'error');
    }
  };

  const openAssociationModal = async (movie) => {
    setAssociationMovie({ ...movie, genres: [], streaming: [] });
    setAssociationGenreId('');
    setAssociationPlatformId('');
    setAssociationPlatformUrl('');
    try {
      const [movieResponse, genresResponse, platformsResponse] = await Promise.all([
        movieApi.getById(movie.movie_id),
        genreApi.getAll(),
        streamingPlatformApi.getAll(),
      ]);
      setGenres(genresResponse.data || []);
      setPlatforms(platformsResponse.data?.platforms || []);
      setAssociationMovie({
        ...movieResponse.data.movie,
        genres: movieResponse.data.genres || [],
        streaming: movieResponse.data.streaming || [],
      });
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not load movie associations', 'error');
    }
  };

  const refreshAssociationMovie = async () => {
    if (!associationMovie) return;
    const response = await movieApi.getById(associationMovie.movie_id);
    setAssociationMovie({
      ...response.data.movie,
      genres: response.data.genres || [],
      streaming: response.data.streaming || [],
    });
  };

  const attachGenreToMovie = async (event) => {
    event.preventDefault();
    if (!associationMovie || !associationGenreId) return;
    try {
      await genreApi.attachToMovie(associationMovie.movie_id, { genre_id: Number(associationGenreId) });
      await refreshAssociationMovie();
      setAssociationGenreId('');
      showToast('Genre assigned to movie');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not assign genre', 'error');
    }
  };

  const removeGenreFromMovie = async (genreId) => {
    try {
      await genreApi.removeFromMovie(associationMovie.movie_id, genreId);
      await refreshAssociationMovie();
      showToast('Genre removed from movie');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not remove genre', 'error');
    }
  };

  const attachPlatformToMovie = async (event) => {
    event.preventDefault();
    if (!associationMovie || !associationPlatformId) return;
    try {
      await streamingPlatformApi.attachToMovie(associationMovie.movie_id, {
        platform_id: Number(associationPlatformId),
        url: associationPlatformUrl.trim() || null,
      });
      await refreshAssociationMovie();
      setAssociationPlatformId('');
      setAssociationPlatformUrl('');
      showToast('Streaming platform assigned to movie');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not assign platform', 'error');
    }
  };

  const removePlatformFromMovie = async (platformId) => {
    try {
      await streamingPlatformApi.removeFromMovie(associationMovie.movie_id, platformId);
      await refreshAssociationMovie();
      showToast('Streaming platform removed from movie');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not remove platform', 'error');
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

  const editGenre = (genre) => {
    setEditingGenreId(genre.genre_id);
    setEditingGenreForm({ name: genre.name || '', description: genre.description || '' });
  };

  const saveGenreEdit = async (event) => {
    event.preventDefault();
    if (!editingGenreForm.name.trim()) {
      showToast('Genre name is required', 'error');
      return;
    }

    try {
      await genreApi.update(editingGenreId, { name: editingGenreForm.name.trim(), description: editingGenreForm.description.trim() });
      const response = await genreApi.getAll();
      setGenres(response.data || []);
      setEditingGenreId(null);
      showToast('Genre updated');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Genre update failed', 'error');
    }
  };

  const deleteGenre = async () => {
    try {
      await genreApi.remove(deleteGenreId);
      setGenres((current) => current.filter((genre) => genre.genre_id !== deleteGenreId));
      setDeleteGenreId(null);
      showToast('Genre deleted');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Genre deletion failed', 'error');
    }
  };

  const createPerson = async (event) => {
    event.preventDefault();
    try {
      if (editingPersonId) {
        await personApi.update(editingPersonId, personForm);
      } else {
        await personApi.create(personForm);
      }
      setPersonForm({ name: '', birth_date: '', biography: '', profile_url: '', person_type: 'actor' });
      setEditingPersonId(null);
      const response = await personApi.getAll();
      setPeople(response.data || []);
      if (editingPersonId) {
        const updatedPerson = (response.data || []).find((person) => Number(person.person_id) === Number(editingPersonId));
        if (updatedPerson) setSelectedAdminPerson((current) => ({ ...current, ...updatedPerson }));
      }
      showToast(editingPersonId ? 'Person updated' : 'Person created');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Person creation failed', 'error');
    }
  };

  const editPerson = (person) => {
    setEditingPersonId(person.person_id);
    setPersonForm({ name: person.name || '', birth_date: person.birth_date || '', biography: person.biography || '', profile_url: person.profile_url || '', person_type: person.person_type || 'actor' });
  };

  const openAdminPerson = async (person) => {
    setAdminPersonLoading(true);
    try {
      const response = await personApi.getDetail(person.person_id);
      setSelectedAdminPerson(response.data?.person || person);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not load person profile', 'error');
    } finally {
      setAdminPersonLoading(false);
    }
  };

  const deletePerson = async (personId) => {
    if (!window.confirm('Delete this person and their credits?')) return;
    try {
      await personApi.remove(personId);
      setPeople((current) => current.filter((person) => person.person_id !== personId));
      setSelectedAdminPerson((current) => current?.person_id === personId ? null : current);
      showToast('Person deleted');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Person deletion failed', 'error');
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
      const response = await movieApi.getById(Number(creditForm.movie_id));
      setAssignMovie((current) => (current ? { ...current, cast: response.data?.cast || [] } : current));
      showToast('Cast/crew credit assigned');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not attach credit', 'error');
    } finally {
      setCreditSubmitting(false);
    }
  };

  const removeMovieCredit = async (credit) => {
    try {
      await personApi.removeMovieCredit(assignMovie.movie_id, credit.person_id, credit.credit_type);
      setAssignMovie((current) => ({
        ...current,
        cast: (current.cast || []).filter((item) => !(Number(item.person_id) === Number(credit.person_id) && item.credit_type === credit.credit_type)),
      }));
      showToast('Cast/crew credit removed');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not remove cast/crew credit', 'error');
    }
  };

  const goToWatchlists = () => {
    if (user?.role === 'admin') return;
    setSelectedWatchlist(null);
    setActiveNav('Watchlist');
    window.location.hash = '/watchlists';
    setRoute('/watchlists');
  };

  const goToProfile = () => {
    setActiveNav('Profile');
    setDashboardTab('Profile');
    window.location.hash = '/profile';
    setRoute('/profile');
  };

  const goToSearch = () => {
    setActiveNav('Search');
    window.location.hash = '/search';
    setRoute('/search');
  };

  const goToUserProfile = (targetUserId) => {
    if (!targetUserId) return;
    setActiveNav('Profile');
    window.location.hash = `/users/${targetUserId}`;
    setRoute(`/users/${targetUserId}`);
  };

  const handleProfileSaved = (updatedUser) => {
    const nextUser = updatedUser || user;
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem('cineverse_user', JSON.stringify(nextUser));
      setProfileName(nextUser.name || '');
    }
    setProfileData((current) => ({ ...(current || {}), user: nextUser }));
    setRoute('/profile');
    window.location.hash = '/profile';
  };

  const handleFriendAction = async (targetUserId, action) => {
    try {
      if (action === 'send') {
        await friendshipApi.sendRequest({ friend_id: targetUserId });
        showToast('Friend request sent');
      }

      if (action === 'accept') {
        await friendshipApi.respond(targetUserId, { status: 'accepted' });
        showToast('Friend request accepted');
      }

      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        friendshipApi.getFriends(),
        friendshipApi.getPending(),
        friendshipApi.getSent(),
      ]);
      setFriends(friendsRes.data?.friends || []);
      setPendingRequests(pendingRes.data?.requests || []);
      setSentRequests(sentRes.data?.requests || []);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Friend action failed', 'error');
    }
  };

  const goToDashboardTab = (tab) => {
    if (user?.role === 'admin') return;
    setDashboardTab(tab);
    setActiveNav(tab === 'Profile' ? 'Dashboard' : tab);
    const nextRoute = tab === 'Profile' ? '/profile' : `/${tab.toLowerCase()}`;
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  };

  const renderWatchlistsPage = () => (
    <section className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Your collection</p>
          <h1 className="mt-2 text-3xl font-black text-white">Watchlists</h1>
        </div>
        <button type="button" onClick={createWatchlist} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-950"><Plus className="h-4 w-4" />New Watchlist</button>
      </div>

      {selectedWatchlist ? (
        <div className="space-y-5">
          <button type="button" onClick={() => setSelectedWatchlist(null)} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Watchlists</button>
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-white">{selectedWatchlist.name}</h2><p className="mt-1 text-sm text-slate-400">{selectedWatchlist.movies?.length || 0} movies</p></div></div>
          {watchlistDetailLoading ? <div className="skeleton h-72 rounded-[28px]" /> : selectedWatchlist.movies?.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {selectedWatchlist.movies.map((movie) => {
                const movieId = movie.movie_id || movie.id;
                return <div key={movieId} className="group overflow-hidden rounded-[28px] border border-slate-800/80 bg-slate-900/55">
                  <button type="button" onClick={() => handleMovieOpen(movieId)} className="block w-full text-left"><img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="aspect-[3/4] w-full object-cover" /><p className="p-4 font-semibold text-white">{movie.title}</p></button>
                  <div className="relative -mt-20 flex justify-end px-3 pb-3 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"><button type="button" onClick={() => removeMovieFromWatchlist(selectedWatchlist.watchlist_id, movieId)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/50 bg-slate-950/85 text-rose-200 hover:bg-rose-500/20" aria-label={`Remove ${movie.title} from watchlist`} title="Remove from watchlist"><X className="h-4 w-4" /></button></div>
                </div>;
              })}
            </div>
          ) : <div className="glass-panel rounded-[28px] border border-slate-800/80 p-6 text-slate-300">No movies in this watchlist yet.</div>}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {watchlists.length ? watchlists.map((list) => (
            <div key={list.watchlist_id} role="button" tabIndex={0} onClick={() => openWatchlist(list.watchlist_id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openWatchlist(list.watchlist_id); } }} className="glass-panel cursor-pointer rounded-[28px] border border-slate-800/80 p-5 transition hover:border-cyan-400/60">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white">{list.name}</h2><p className="mt-2 text-sm text-slate-400">{list.movie_count || 0} movies</p></div><Bookmark className="h-5 w-5 text-cyan-300" /></div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={(event) => { event.stopPropagation(); renameWatchlist(list); }} className="rounded-full border border-slate-700/80 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white">Rename</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); deleteWatchlist(list.watchlist_id); }} className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" />Delete</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); setSharePickerId(sharePickerId === list.watchlist_id ? null : list.watchlist_id); }} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white"><Share2 className="h-4 w-4" />Share</button>
              </div>
              {sharePickerId === list.watchlist_id && <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-slate-950/40 p-3" onClick={(event) => event.stopPropagation()}><p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Share with a friend</p>{friends.length ? <div className="flex flex-wrap gap-2">{friends.map((friend) => <button key={friend.user_id} type="button" onClick={() => shareWatchlist(list.watchlist_id, friend)} className="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white">{friend.name}</button>)}</div> : <p className="text-sm text-slate-400">Add accepted friends before sharing.</p>}</div>}
            </div>
          )) : <div className="glass-panel rounded-[28px] border border-slate-800/80 p-6 text-slate-300">No watchlists yet. Create one to get started.</div>}
        </div>
      )}
      <div className="mt-8 border-t border-slate-800 pt-6">
        <h2 className="text-xl font-bold text-white">Shared with me</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {sharedWatchlists.length ? sharedWatchlists.map((shared) => (
            <button key={shared.share_id} type="button" onClick={async () => { try { const response = await watchlistApi.getSharedWatchlist(shared.watchlist_id); setSelectedWatchlist(response.data?.watchlist || null); } catch (error) { showToast(error?.response?.data?.message || 'Could not load shared watchlist', 'error'); } }} className="rounded-2xl border border-slate-700 bg-slate-900/45 p-4 text-left hover:border-cyan-400/60"><p className="font-semibold text-white">{shared.watchlist_name}</p><p className="mt-1 text-sm text-slate-400">Shared by {shared.shared_by_name}</p></button>
          )) : <p className="text-sm text-slate-400">No shared watchlists yet.</p>}
        </div>
      </div>
    </section>
  );

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

    if (!token && route !== '/') {
      return null;
    }

    if (!token) {
      return (
        <Landing
          movies={movies}
          onLoginClick={() => { setAuthMode('login'); window.location.hash = '/login'; setRoute('/login'); }}
          onRegisterClick={() => { setAuthMode('register'); window.location.hash = '/register'; setRoute('/register'); }}
        />
      );
    }

    const personRoute = route.match(/^\/person\/(?:tmdb\/)?(\d+)$/);
    if (personRoute) {
      const isTmdbPerson = route.startsWith('/person/tmdb/');
      return <PersonDetail personId={isTmdbPerson ? null : Number(personRoute[1])} tmdbId={isTmdbPerson ? Number(personRoute[1]) : null} onBack={() => { setRoute('/'); }} onMovieOpen={handleMovieOpen} onPersonOpen={handlePersonOpen} />;
    }

    if (route === '/watchlists') {
      return renderWatchlistsPage();
    }

    if (route === '/profile') {
      return (
        <ProfilePage
          user={profileData?.user || user}
          profileData={profileData}
          onEdit={() => { window.location.hash = '/profile/edit'; setRoute('/profile/edit'); }}
          onNavigateUser={(targetRoute) => { window.location.hash = targetRoute; setRoute(targetRoute); }}
          onNavigateSearch={goToSearch}
          onNavigateWatchlist={(watchlistId) => { setSelectedWatchlist(null); window.location.hash = '/watchlists'; setRoute('/watchlists'); void watchlistId; }}
        />
      );
    }

    if (route === '/profile/edit') {
      return (
        <EditProfilePage
          user={profileData?.user || user}
          onCancel={goToProfile}
          onSaved={handleProfileSaved}
        />
      );
    }

    if (route === '/search') {
      return <SearchPage onOpenMovie={handleMovieOpen} onOpenUser={goToUserProfile} />;
    }

    if (route.startsWith('/users/')) {
      const targetUserId = route.match(/^\/users\/(\d+)$/)?.[1];
      if (!targetUserId) return <main className="mx-auto max-w-5xl py-8"><div className="glass-panel rounded-[28px] p-6 text-slate-300">User not found.</div></main>;
      return (
        <PublicProfilePage
          userId={targetUserId}
          currentUser={user}
          friends={friends}
          pendingRequests={pendingRequests}
          sentRequests={sentRequests}
          onFriendAction={handleFriendAction}
        />
      );
    }

    if (route === '/admin') {
      return (
        <div className="space-y-6 py-8">
          <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
            <div className="flex flex-wrap gap-2">
              {adminTabs.map((tab) => (
                <button key={tab} type="button" onClick={() => { setAdminTab(tab); if (tab === 'Streaming Platforms') loadPlatforms(); }} className={`rounded-full px-4 py-2 text-sm font-medium ${adminTab === tab ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'border border-slate-700 bg-slate-900/40 text-slate-300'}`}>
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
                  <button type="button" onClick={() => { setEditingMovieId(null); setMovieForm({ title: '', description: '', release_year: '', duration: '', language: '', rating: '', poster_url: '', backdrop_url: '', trailer_url: '' }); setMovieModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950">
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
                    {adminMovieLoading ? Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`movie-skeleton-${index}`}><td colSpan="7" className="px-3 py-5"><div className="h-5 animate-pulse rounded bg-slate-800" /></td></tr>
                    )) : (adminSearchResults ?? adminMovies).map((movie) => {
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
                            <button type="button" onClick={() => handleMovieOpen(movieId)} className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10">Manage Images</button>
                            <button type="button" onClick={() => editMovie(movie)} className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10">Edit</button>
                            <button type="button" onClick={() => openAssociationModal(movie)} className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10">Genres & Platforms</button>
                            <button type="button" onClick={() => openAssignModal(movie)} className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10">Assign Cast/Crew</button>
                            <button type="button" onClick={() => setDeleteMovieId(movieId)} className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-400/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!(adminSearchResults ?? adminMovies).length && <div className="py-10 text-center text-slate-500">No movies found.</div>}
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
                      {editingGenreId === genre.genre_id ? (
                        <form onSubmit={saveGenreEdit} className="space-y-3">
                          <input value={editingGenreForm.name} onChange={(event) => setEditingGenreForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white" required />
                          <textarea value={editingGenreForm.description} onChange={(event) => setEditingGenreForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white" rows="3" />
                          <div className="flex gap-2"><button type="submit" className="rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950">Save</button><button type="button" onClick={() => setEditingGenreId(null)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button></div>
                        </form>
                      ) : (
                        <><div className="flex items-center justify-between gap-2"><p className="font-semibold text-white">{genre.name}</p><div className="flex gap-2"><button type="button" onClick={() => editGenre(genre)} className="text-xs text-cyan-300">Edit</button><button type="button" onClick={() => setDeleteGenreId(genre.genre_id)} className="text-xs text-rose-300">Delete</button></div></div><p className="mt-1 text-sm text-slate-400">{genre.description || 'No description provided'}</p></>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'Streaming Platforms' && (
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <form onSubmit={createPlatform} className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                <h3 className="mb-4 text-xl font-bold text-white">Add streaming platform</h3>
                <div className="space-y-3">
                  {['name', 'logo_url', 'country', 'url', 'subscription_type'].map((field) => (
                    <input key={field} type={field === 'url' || field === 'logo_url' ? 'url' : 'text'} value={platformForm[field]} onChange={(event) => setPlatformForm((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white" placeholder={field.replace('_', ' ')} required={field === 'name'} />
                  ))}
                  <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 font-semibold text-slate-950">Create platform</button>
                </div>
              </form>
              <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                <h3 className="mb-4 text-xl font-bold text-white">Streaming platforms</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {platforms.length ? platforms.map((platform) => (
                    <div key={platform.platform_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
                      {platform.url ? <a href={platform.url.startsWith('http') ? platform.url : `https://${platform.url}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 hover:text-cyan-200" title={`Open ${platform.name}`}><div className="flex min-w-0 items-center gap-3">{platform.logo_url ? <img src={platform.logo_url} alt="" className="h-9 w-9 rounded object-cover" /> : <Tv className="h-5 w-5 text-cyan-300" />}<span className="truncate font-semibold text-white">{platform.name}</span></div></a> : <div className="flex min-w-0 items-center gap-3">{platform.logo_url ? <img src={platform.logo_url} alt="" className="h-9 w-9 rounded object-cover" /> : <Tv className="h-5 w-5 text-cyan-300" />}<span className="truncate font-semibold text-white">{platform.name}</span></div>}
                      <div className="flex gap-2"><button type="button" onClick={() => editPlatform(platform)} className="text-xs text-cyan-300 hover:text-cyan-200">Edit</button><button type="button" onClick={() => deletePlatform(platform.platform_id)} className="text-xs text-rose-300 hover:text-rose-200">Delete</button></div>
                    </div>
                  )) : <p className="text-sm text-slate-400">No platforms found.</p>}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'Cast & Crew Assignment' && (
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <form onSubmit={createPerson} className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">People catalog</p><h3 className="mt-2 text-xl font-bold text-white">{editingPersonId ? 'Edit cast or crew' : 'Add cast or crew'}</h3>
                <div className="mt-4 space-y-3">{['name', 'birth_date', 'profile_url'].map((field) => <input key={field} type={field === 'birth_date' ? 'date' : field === 'profile_url' ? 'url' : 'text'} value={personForm[field]} onChange={(event) => setPersonForm((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white" placeholder={field.replace('_', ' ')} required={field === 'name'} />)}<textarea value={personForm.biography} onChange={(event) => setPersonForm((current) => ({ ...current, biography: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white" placeholder="Biography" rows="3" /><select value={personForm.person_type} onChange={(event) => setPersonForm((current) => ({ ...current, person_type: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white"><option value="actor">Actor</option><option value="director">Director</option><option value="writer">Writer</option><option value="producer">Producer</option></select><button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 font-semibold text-slate-950">{editingPersonId ? 'Save person' : 'Create person'}</button>{editingPersonId && <button type="button" onClick={() => { setEditingPersonId(null); setPersonForm({ name: '', birth_date: '', biography: '', profile_url: '', person_type: 'actor' }); }} className="w-full rounded-full border border-slate-700 px-4 py-3 text-sm text-slate-300">Cancel edit</button>}</div>
              </form>
              <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Cast and crew</p>
                {adminPersonLoading ? <div className="mt-6 skeleton h-64 rounded-2xl" /> : selectedAdminPerson ? (
                  <div className="mt-4">
                    <button type="button" onClick={() => setSelectedAdminPerson(null)} className="text-sm text-cyan-300 hover:text-cyan-200">Back to people</button>
                    <div className="mt-4 flex flex-col gap-5 sm:flex-row">
                      <img src={selectedAdminPerson.profile_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'} alt={selectedAdminPerson.name} className="h-48 w-36 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3"><h3 className="text-2xl font-bold text-white">{selectedAdminPerson.name}</h3><span className="rounded-full border border-cyan-400/40 px-2.5 py-1 text-xs capitalize text-cyan-200">{selectedAdminPerson.person_type || 'person'}</span></div>
                        <p className="mt-2 text-sm text-slate-400">{selectedAdminPerson.birth_date ? new Date(selectedAdminPerson.birth_date).toLocaleDateString() : 'Birth date not available'}</p>
                        <p className="mt-4 text-sm leading-6 text-slate-300">{selectedAdminPerson.biography || 'No biography available.'}</p>
                        <button type="button" onClick={() => editPerson(selectedAdminPerson)} className="mt-4 rounded-full border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10">Edit profile</button>
                      </div>
                    </div>
                    <h4 className="mt-6 font-semibold text-white">Filmography</h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">{(selectedAdminPerson.movies || []).map((movie) => <div key={`${movie.movie_id}-${movie.credit_type}`} className="rounded-xl border border-slate-700 bg-slate-900/50 p-2"><img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="aspect-[3/4] w-full rounded-lg object-cover" /><p className="mt-2 truncate text-xs font-semibold text-white">{movie.title}</p><p className="text-[11px] capitalize text-slate-400">{movie.credit_type || 'credit'}</p></div>)}</div>
                  </div>
                ) : (
                  <><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="mt-2 text-2xl font-bold text-white">Manage people and assign credits</h3><p className="mt-2 max-w-xl text-slate-400">Click a person to view their profile, biography, and filmography.</p></div><input value={personSearch} onChange={(event) => setPersonSearch(event.target.value)} placeholder="Search people" className="w-full rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/80 sm:w-56" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{peopleLoading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-14 rounded-2xl" />) : visiblePeople.map((person) => <div key={person.person_id} role="button" tabIndex={0} onClick={() => openAdminPerson(person)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openAdminPerson(person); } }} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-3 transition hover:border-cyan-400/60"><span className="truncate text-sm font-semibold text-white">{person.name}</span><div className="flex gap-3"><button type="button" onClick={(event) => { event.stopPropagation(); editPerson(person); }} className="text-xs text-cyan-300">Edit</button><button type="button" onClick={(event) => { event.stopPropagation(); deletePerson(person.person_id); }} className="text-xs text-rose-300">Delete</button></div></div>)}{!peopleLoading && !visiblePeople.length && <p className="col-span-full py-8 text-center text-sm text-slate-400">No people found.</p>}</div></>
                )}
              </div>
            </div>
          )}

          {movieModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
              <form onSubmit={createMovie} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Catalog control</p><h3 className="mt-1 text-2xl font-bold text-white">{editingMovieId ? 'Edit movie' : 'Add new movie'}</h3></div><button type="button" onClick={() => { setMovieModalOpen(false); setEditingMovieId(null); }} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Title</span><input value={movieForm.title} onChange={(event) => setMovieForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" required /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Description</span><textarea value={movieForm.description} onChange={(event) => setMovieForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" rows="4" required /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Release Year</span><input type="number" value={movieForm.release_year} onChange={(event) => setMovieForm((current) => ({ ...current, release_year: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Duration (mins)</span><input type="number" value={movieForm.duration} onChange={(event) => setMovieForm((current) => ({ ...current, duration: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Language</span><input value={movieForm.language} onChange={(event) => setMovieForm((current) => ({ ...current, language: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label><span className="mb-1 block text-sm text-slate-300">Rating</span><input type="number" step="0.1" value={movieForm.rating} onChange={(event) => setMovieForm((current) => ({ ...current, rating: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Poster URL</span><input type="url" value={movieForm.poster_url} onChange={(event) => setMovieForm((current) => ({ ...current, poster_url: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Backdrop URL</span><input type="url" value={movieForm.backdrop_url} onChange={(event) => setMovieForm((current) => ({ ...current, backdrop_url: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                  <label className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-300">Trailer URL</span><input type="url" value={movieForm.trailer_url} onChange={(event) => setMovieForm((current) => ({ ...current, trailer_url: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label>
                </div>
                <button type="submit" disabled={movieSubmitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{movieSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />} {movieSubmitting ? 'Saving...' : editingMovieId ? 'Save Movie' : 'Create Movie'}</button>
              </form>
            </div>
          )}

          {deleteMovieId !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[28px] border border-rose-400/30 bg-slate-900 p-6 shadow-2xl"><h3 className="text-xl font-bold text-white">Delete movie?</h3><p className="mt-2 text-slate-400">Are you sure you want to delete this movie?</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteMovieId(null)} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button><button type="button" onClick={deleteMovie} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Delete</button></div></div></div>
          )}

          {deleteGenreId !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[28px] border border-rose-400/30 bg-slate-900 p-6 shadow-2xl"><h3 className="text-xl font-bold text-white">Delete genre?</h3><p className="mt-2 text-slate-400">Are you sure you want to delete this genre?</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteGenreId(null)} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button><button type="button" onClick={deleteGenre} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Delete</button></div></div></div>
          )}

          {associationMovie && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Movie relationships</p><h3 className="mt-1 text-2xl font-bold text-white">{associationMovie.title}</h3></div><button type="button" onClick={() => setAssociationMovie(null)} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div>
                <div className="grid gap-6 md:grid-cols-2">
                  <section className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4"><h4 className="font-semibold text-white">Genres</h4><form onSubmit={attachGenreToMovie} className="mt-3 flex gap-2"><select value={associationGenreId} onChange={(event) => setAssociationGenreId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="">Choose genre</option>{genres.filter((genre) => !(associationMovie.genres || []).some((item) => Number(item.genre_id) === Number(genre.genre_id))).map((genre) => <option key={genre.genre_id} value={genre.genre_id}>{genre.name}</option>)}</select><button type="submit" className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Add</button></form><div className="mt-4 flex flex-wrap gap-2">{associationMovie.genres?.length ? associationMovie.genres.map((genre) => <span key={genre.genre_id} className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200">{genre.name}<button type="button" onClick={() => removeGenreFromMovie(genre.genre_id)} className="text-rose-300" aria-label={`Remove ${genre.name}`}>x</button></span>) : <p className="text-sm text-slate-500">No genres assigned.</p>}</div></section>
                  <section className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4"><h4 className="font-semibold text-white">Streaming platforms</h4><form onSubmit={attachPlatformToMovie} className="mt-3 space-y-2"><select value={associationPlatformId} onChange={(event) => setAssociationPlatformId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="">Choose platform</option>{platforms.filter((platform) => !(associationMovie.streaming || []).some((item) => Number(item.platform_id) === Number(platform.platform_id))).map((platform) => <option key={platform.platform_id} value={platform.platform_id}>{platform.name}</option>)}</select><div className="flex gap-2"><input type="url" value={associationPlatformUrl} onChange={(event) => setAssociationPlatformUrl(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Movie streaming URL" /><button type="submit" className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Add</button></div></form><div className="mt-4 space-y-2">{associationMovie.streaming?.length ? associationMovie.streaming.map((platform) => <div key={platform.platform_id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm"><span className="truncate text-slate-200">{platform.name}</span><button type="button" onClick={() => removePlatformFromMovie(platform.platform_id)} className="text-rose-300">Remove</button></div>) : <p className="text-sm text-slate-500">No platforms assigned.</p>}</div></section>
                </div>
              </div>
            </div>
          )}

          {assignMovie && (
            <div className="pointer-events-none fixed inset-y-0 left-0 z-[51] flex w-full max-w-sm items-center p-4 lg:left-4">
              <div className="pointer-events-auto max-h-[70vh] w-full overflow-y-auto rounded-[28px] border border-slate-700 bg-slate-900/95 p-5 shadow-2xl">
                <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Existing credits</p><h3 className="mt-1 text-lg font-bold text-white">{assignMovie.title}</h3></div><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{assignMovie.cast?.length || 0}</span></div>
                <div className="mt-4 space-y-2">{assignMovie.cast?.length ? assignMovie.cast.map((credit) => <div key={`${credit.person_id}-${credit.credit_type}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{credit.name}</p><p className="mt-1 text-xs capitalize text-slate-400">{credit.credit_type}{credit.character_name ? ` · ${credit.character_name}` : ''}</p></div><button type="button" onClick={() => removeMovieCredit(credit)} className="shrink-0 rounded-full border border-rose-400/40 p-2 text-rose-300 hover:bg-rose-500/10" aria-label={`Remove ${credit.name} credit`} title="Remove credit"><X className="h-3.5 w-3.5" /></button></div>) : <p className="text-sm text-slate-400">No cast or crew credits assigned.</p>}</div>
              </div>
            </div>
          )}

          {assignMovie && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><form onSubmit={attachCredit} className="w-full max-w-lg rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{assignMovie.title}</p><h3 className="mt-1 text-2xl font-bold text-white">Assign cast or crew</h3></div><button type="button" onClick={() => setAssignMovie(null)} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div><div className="space-y-4"><label className="block"><span className="mb-1 block text-sm text-slate-300">Select Person</span><select value={creditForm.name} onChange={(event) => setCreditForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" required><option value="">Choose a person</option>{people.map((person) => <option key={person.person_id} value={person.person_id}>{person.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-sm text-slate-300">Credit Type</span><select value={creditForm.person_type} onChange={(event) => setCreditForm((current) => ({ ...current, person_type: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white"><option value="actor">Actor</option><option value="director">Director</option><option value="writer">Writer</option><option value="producer">Producer</option></select></label><label className="block"><span className="mb-1 block text-sm text-slate-300">Character Name (optional)</span><input value={creditForm.character_name} onChange={(event) => setCreditForm((current) => ({ ...current, character_name: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-white" /></label></div><button type="submit" disabled={creditSubmitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{creditSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />} {creditSubmitting ? 'Assigning...' : 'Assign Credit'}</button></form></div>
          )}
        </div>
      );
    }

    return (
      <>
        {route === '/' && (
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
                    <button type="button" disabled={addingMovieId !== null} onClick={() => addMovieToWatchlist(featuredMovie)} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/40 px-6 py-3 text-sm font-semibold text-white hover:border-cyan-400/80 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                      {addingMovieId === (featuredMovie.movie_id || featuredMovie.id || featuredMovie.movieId) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {addingMovieId === (featuredMovie.movie_id || featuredMovie.id || featuredMovie.movieId) ? 'Adding...' : 'Add to Watchlist'}
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

          {token && recommendations.length > 0 && (
            <section className="mt-8 border-y border-cyan-400/15 bg-cyan-400/[0.03] px-4 py-6 sm:px-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Personalized picks</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">Recommended for You</h2>
                </div>
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {recommendations.map((movie) => (
                  <button key={movie.movie_id} type="button" onClick={() => handleMovieOpen(movie.movie_id)} className="group flex gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-left transition hover:border-cyan-400/60">
                    <img src={movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={movie.title} className="h-28 w-20 rounded-xl object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white group-hover:text-cyan-200">{movie.title}</span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-amber-300"><Star className="h-3 w-3 fill-amber-400" />{toDisplayNumber(movie.average_rating || movie.rating)}</span>
                      <span className="mt-2 line-clamp-3 block text-xs leading-5 text-slate-400">{movie.reason}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

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
                  </div>
                </div>
              ))}
            </div>
          )}
            </section>
          </>
        )}

        {route.startsWith('/movie/') && selectedMovie && (
          <section className="mt-8">
            <button type="button" onClick={() => { window.location.hash = '/'; setRoute('/'); }} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to movies
            </button>

            <div className="relative mt-5 overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-950 shadow-[0_30px_80px_rgba(8,15,30,0.8)]">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg, rgba(9,13,22,0.9) 0%, rgba(9,13,22,0.78) 32%, rgba(9,13,22,0.72) 100%), url('${selectedMovie.backdrop_url || selectedMovie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'}')` }} />

              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="grid gap-4 lg:grid-cols-[260px_1fr_180px]">
                  <div className="glass-panel rounded-[28px] border border-slate-700/80 p-3">
                    <img src={selectedMovie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={selectedMovie.title} className="aspect-[3/4] w-full rounded-[22px] object-cover" />
                  </div>

                  <div className="group relative aspect-video cursor-pointer overflow-hidden rounded-[22px] border border-slate-700/80 bg-slate-900" onClick={() => selectedMovie.trailer_url && setTrailerOpen(true)}>
                    <img src={selectedMovie.backdrop_url || selectedMovie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt={`${selectedMovie.title} preview`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 transition group-hover:bg-black/40" />
                    {selectedMovie.trailer_url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 transition group-hover:scale-110">
                          <CirclePlay className="h-8 w-8 fill-slate-950 text-slate-950" />
                        </div>
                      </div>
                    )}
                    {!selectedMovie.trailer_url && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">No trailer available</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => selectedMovie.trailer_url && setTrailerOpen(true)} disabled={!selectedMovie.trailer_url} className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4 text-slate-200 transition hover:border-cyan-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                      <CirclePlay className="h-6 w-6" />
                      <span className="text-xs font-semibold uppercase tracking-wide">{selectedMovie.trailer_url ? '1 Video' : 'No Video'}</span>
                    </button>
                    <button type="button" onClick={() => (selectedMovie.images || []).length > 0 && openGallery(0)} disabled={!(selectedMovie.images || []).length} className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4 text-slate-200 transition hover:border-cyan-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                      <Film className="h-6 w-6" />
                      <span className="text-xs font-semibold uppercase tracking-wide">{(selectedMovie.images || []).length ? `${selectedMovie.images.length} Photos` : 'No Photos'}</span>
                    </button>
                  </div>

                  <div className="space-y-5 lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(selectedMovie.genres || []).slice(0, 3).map((genre) => (
                        <span key={genre.genre_id} className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">{genre.name}</span>
                      ))}
                    </div>

                    {(selectedMovie.production_companies || []).length > 0 && <p className="text-sm text-slate-300"><span className="font-semibold text-slate-400">Production:</span> {selectedMovie.production_companies.map((company) => company.name).join(', ')}</p>}

                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{selectedMovie.title}</h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-300"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{toDisplayNumber(selectedMovie.average_rating || selectedMovie.rating)}</span>
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
                      <button type="button" onClick={() => setTrailerOpen(true)} disabled={!selectedMovie.trailer_url} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"><CirclePlay className="h-4 w-4 fill-slate-950" />Watch Trailer</button>
                      <button type="button" onClick={markAsWatched} className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200"><Check className="h-4 w-4" />Mark as Watched</button>
                      <button type="button" disabled={addingMovieId !== null} onClick={() => addMovieToWatchlist(selectedMovie)} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/40 px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{addingMovieId === (selectedMovie.movie_id || selectedMovie.id || selectedMovie.movieId) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}{addingMovieId === (selectedMovie.movie_id || selectedMovie.id || selectedMovie.movieId) ? 'Adding...' : 'Add to Watchlist'}</button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
                      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Reviews</p><p className="mt-2 text-xl font-bold text-white">{reviews.length}</p></div>
                      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Rating</p><p className="mt-2 text-xl font-bold text-cyan-300">{toDisplayNumber(selectedMovie.average_rating || selectedMovie.rating)}</p></div>
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
                        <button key={`${person.name}-${index}`} type="button" onClick={() => person.person_id && handlePersonOpen(person)} disabled={!person.person_id} className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3 text-left transition hover:border-cyan-400/60 disabled:cursor-default">
                          {person.profile_url ? (
                            <img src={person.profile_url} alt={person.name} className="aspect-[2/3] w-full rounded-2xl object-cover" />
                          ) : (
                            <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-2xl font-bold text-slate-400">
                              {person.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="mt-3"><p className="font-semibold text-white">{person.name}</p><p className="text-sm text-slate-400">{person.role || person.character_name || 'Crew member'}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">User Reviews</h2><MessageSquareText className="h-5 w-5 text-cyan-300" /></div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-4">
                      <p className="text-5xl font-black text-amber-400">{reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1) : '0.0'}</p>
                      <div><div className="flex items-center gap-1 text-amber-400"><Star className="h-5 w-5 fill-amber-400" /><span className="font-semibold">IMDb-style rating</span></div><p className="mt-1 text-sm text-slate-400">{reviews.length} {reviews.length === 1 ? 'rating' : 'ratings'}</p></div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400"><span>Sort by</span><select value={reviewSort} onChange={(event) => setReviewSort(event.target.value)} className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-200 outline-none"><option value="recent">Most Recent</option><option value="highest">Highest Rated</option><option value="lowest">Lowest Rated</option></select></div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {sortedReviews.length ? sortedReviews.map((review) => (
                      <div key={review.review_id} className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-4">
                        {editingReviewId === review.review_id ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-1" onMouseLeave={() => setEditHoverRating(0)}>{Array.from({ length: 10 }, (_, index) => { const rating = index + 1; return <button key={rating} type="button" onMouseEnter={() => setEditHoverRating(rating)} onClick={() => setEditReviewRating(rating)} aria-label={`Set rating to ${rating}`}><Star className={`h-5 w-5 ${rating <= (editHoverRating || editReviewRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} /></button>; })}</div>
                            <textarea value={editReviewText} onChange={(event) => setEditReviewText(event.target.value)} rows="3" className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-white outline-none focus:border-cyan-400/80" />
                            <div className="flex gap-2"><button type="button" onClick={saveReviewEdit} className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-xs font-semibold text-slate-950">Save</button><button type="button" onClick={() => setEditingReviewId(null)} className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300">Cancel</button></div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-bold text-slate-950">{review.user_name?.[0]?.toUpperCase() || 'V'}</div><div><p className="font-semibold text-white">{review.user_name || review.user || 'Viewer'}</p><p className="text-xs text-slate-400">{timeAgo(review.created_at)}</p></div></div>
                              <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-300"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{toDisplayNumber(review.rating)}</span>{review.user_id === user?.user_id && <><button type="button" onClick={() => beginReviewEdit(review)} className="text-xs text-cyan-300">Edit</button>{deleteReviewId === review.review_id ? <><button type="button" onClick={() => deleteReview(review.review_id)} className="text-xs font-semibold text-rose-300">Yes</button><button type="button" onClick={() => setDeleteReviewId(null)} className="text-xs text-slate-400">Cancel</button></> : <button type="button" onClick={() => setDeleteReviewId(review.review_id)} className="text-xs text-rose-300">Delete</button>}</>}</div>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">{getVisibleReviewText(review)}</p>
                          </>
                        )}
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
                        <div className="flex items-center gap-3">
                          {platform.logo_url ? (
                            <img src={platform.logo_url} alt={platform.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-slate-700 flex items-center justify-center text-xs font-bold">{platform.name?.[0]}</div>
                          )}
                          <span>{platform.name}</span>
                        </div>
                        {platform.stream_url ? (
                          <a href={platform.stream_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/20">
                            <Check className="h-3.5 w-3.5" />Watch
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300"><Check className="h-3.5 w-3.5" />Available</span>
                        )}
                      </div>
                    )) : <div className="rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3 text-slate-300">No platform data available yet.</div> }
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Add Review</h2>
                  <form onSubmit={submitReview} className="mt-4 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">Your rating</span>
                      <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>{Array.from({ length: 10 }, (_, index) => { const rating = index + 1; return <button key={rating} type="button" onMouseEnter={() => setHoverRating(rating)} onClick={() => setReviewRating(rating)} aria-label={`Set rating to ${rating}`}><Star className={`h-5 w-5 ${rating <= (hoverRating || reviewRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} /></button>; })}<span className="ml-2 text-sm text-slate-400">{reviewRating}/10</span></div>
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

            {user?.role === 'admin' && (
              <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 sm:flex-row"><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Gallery image URL" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white" /><button type="button" onClick={addMovieImage} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Add gallery image</button></div>
            )}

            {/* Trailer Modal */}
            {trailerOpen && selectedMovie.trailer_url && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setTrailerOpen(false)}>
                <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-950" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4">
                    <h3 className="text-lg font-bold text-white">{selectedMovie.title} — Trailer</h3>
                    <button type="button" onClick={() => setTrailerOpen(false)} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="aspect-video w-full">
                    <iframe
                      src={getYouTubeEmbedUrl(selectedMovie.trailer_url)}
                      title="Movie trailer"
                      className="h-full w-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            )}

            {galleryIndex !== null && selectedMovie.images?.[galleryIndex] && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm" onClick={closeGallery}>
                <div className="relative w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-slate-300">{galleryIndex + 1} / {selectedMovie.images.length}</span>
                    <button type="button" onClick={closeGallery} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="relative">
                    <img src={selectedMovie.images[galleryIndex].image_url} alt="Gallery" className="max-h-[75vh] w-full rounded-xl object-contain" />
                    {user?.role === 'admin' && <button type="button" onClick={() => { removeMovieImage(selectedMovie.images[galleryIndex].image_id); closeGallery(); }} className="mt-3 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Delete image</button>}
                    {selectedMovie.images.length > 1 && (
                      <>
                        <button type="button" onClick={prevGalleryImage} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950"><ArrowLeft className="h-5 w-5" /></button>
                        <button type="button" onClick={nextGalleryImage} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950 rotate-180"><ArrowLeft className="h-5 w-5" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {['/history', '/friends'].includes(route) && (
          <section ref={dashboardSectionRef} className="mt-8">
            <div className="glass-panel rounded-[28px] border border-slate-800/80 p-4">
              <div className="flex flex-wrap gap-2 md:hidden">
                {dashboardTabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => { setDashboardTab(tab); setActiveNav(tab === 'Profile' ? 'Dashboard' : tab); }} className={`rounded-full px-4 py-2 text-sm font-medium ${dashboardTab === tab ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950' : 'border border-slate-700/80 bg-slate-900/50 text-slate-300 hover:border-cyan-400/70 hover:text-white'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {dashboardTab === 'Profile' && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
                  <form onSubmit={saveProfile} className="mb-6 border-b border-slate-800 pb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Profile</p><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white" placeholder="Your name" required /><button type="submit" className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950">Save profile</button></div><p className="mt-2 text-sm text-slate-400">{user?.email}</p></form>
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

            {dashboardTab === 'History' && (
              <div className="mt-6 grid gap-4">
                {loading.history ? <div className="skeleton h-28 rounded-[28px]" /> : watchHistory.length ? watchHistory.map((item) => (
                  <div key={item.history_id} className="glass-panel rounded-[28px] border border-slate-800/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="text-sm text-slate-400">{item.watched_at ? new Date(item.watched_at).toLocaleString() : 'Recently watched'}</p>
                      </div>
                      <div className="flex items-center gap-3"><span className="text-sm font-semibold text-cyan-300">{item.progress ?? 0}%</span><button type="button" onClick={() => deleteHistoryItem(item.history_id)} className="text-xs text-rose-300 hover:text-rose-200">Remove</button></div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${item.progress ?? 0}%` }} /></div>
                  </div>
                )) : <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5 text-slate-300">No watch history yet. Start watching to build your history.</div>}
              </div>
            )}

            {dashboardTab === 'Friends' && (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="glass-panel relative z-40 rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Add a friend</h2>
                  <form onSubmit={sendFriendRequest} className="relative z-30 mt-4 flex flex-col gap-3 sm:flex-row">
                    <div ref={friendSearchRef} className="relative min-w-0 flex-1"><input type="text" value={friendEmail} onChange={(event) => { setFriendEmail(event.target.value); setSelectedFriend(null); }} placeholder="Search by name or username" className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/45 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400/80 focus:outline-none" />{friendSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">{friendSuggestions.map((candidate) => <button key={candidate.user_id} type="button" onClick={() => { setFriendSuggestions([]); setFriendEmail(candidate.display_name || candidate.name || candidate.username); setSelectedFriend(candidate); }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800"><img src={normalizeImage(candidate.profile_image)} alt="" className="h-8 w-8 rounded-full object-cover" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{candidate.display_name || candidate.name}</span><span className="block truncate text-xs text-slate-400">@{candidate.username || candidate.name}</span></span></button>)}</div>}</div>
                    <button type="submit" className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950">Send request</button>
                  </form>
                </div>

                <div className="glass-panel relative z-10 rounded-[28px] border border-slate-800/80 p-5">
                  <h2 className="text-xl font-bold text-white">Pending requests received</h2>
                  <div className="mt-4 space-y-3">
                    {loading.friends ? <div className="skeleton h-16 rounded-2xl" /> : pendingRequests.length ? pendingRequests.map((request) => (
                      <div key={request.friendship_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/45 p-3">
                        <button type="button" onClick={() => goToUserProfile(request.sender_id)} className="min-w-0 text-left hover:text-cyan-200"><p className="font-semibold text-white">{request.sender_name}</p><p className="text-sm text-slate-400">{request.sender_email}</p></button>
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
                        <button type="button" onClick={() => goToUserProfile(friend.user_id)} className="min-w-0 text-left hover:text-cyan-200"><p className="truncate font-semibold text-white">{friend.name}</p><p className="truncate text-sm text-slate-400">{friend.email}</p></button>
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
                        <button type="button" onClick={() => goToUserProfile(request.recipient_id)} className="min-w-0 text-left hover:text-cyan-200"><p className="font-semibold text-white">{request.recipient_name}</p><p className="text-sm text-slate-400">{request.recipient_email}</p></button>
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
        <header className={`app-header sticky top-4 z-30 flex items-center gap-3 rounded-2xl px-3 py-3 transition-transform duration-300 sm:px-4 ${token ? 'border border-slate-800/80' : 'justify-center bg-transparent shadow-none'} ${headerVisible ? 'translate-y-0' : '-translate-y-[calc(100%+2rem)]'}`}>
          <div className="flex items-center gap-3">
            {token && <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/20"><Film className="h-5 w-5" /></div>}
            <p className={`${token ? 'text-lg font-semibold tracking-tight text-white' : 'bg-gradient-to-r from-cyan-300 via-white to-indigo-300 bg-clip-text text-xl font-black tracking-[0.08em] text-transparent drop-shadow-[0_0_18px_rgba(34,211,238,0.35)]'}`}>Cineverse</p>
          </div>

          {token && (
            <div ref={searchMenuRef} className="relative hidden min-w-[220px] items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-slate-300 md:flex lg:min-w-[300px]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchSuggestions[0]) {
                    setSearchOpen(false);
                    if (searchSuggestions[0].suggestionType === 'movie') handleMovieOpen(searchSuggestions[0].movie_id);
                    else handlePersonOpen(searchSuggestions[0]);
                  }
                }}
                placeholder="Search titles, genres..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchOpen && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 p-1 shadow-2xl">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.suggestionType}-${suggestion.movie_id || suggestion.person_id}`}
                      type="button"
                      onClick={() => { setSearchOpen(false); if (suggestion.suggestionType === 'movie') { setSearchTerm(''); handleMovieOpen(suggestion.movie_id); } else handlePersonOpen(suggestion); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-cyan-400/10 hover:text-white"
                    >
                      {suggestion.suggestionType === 'movie' ? <img src={suggestion.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c'} alt="" className="h-10 w-7 rounded object-cover" /> : <img src={suggestion.profile_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'} alt="" className="h-10 w-7 rounded object-cover" />}
                      <span className="min-w-0 flex-1 truncate">{suggestion.suggestionType === 'movie' ? suggestion.title : suggestion.name}</span>
                      <span className="text-xs text-cyan-300">{suggestion.suggestionType === 'movie' ? toDisplayNumber(suggestion.average_rating || suggestion.rating) : (suggestion.person_type || 'People')}</span>
                    </button>
                  ))}
                </div>
              )}
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
              <button type="button" onClick={() => { setActiveNav('Home'); setDashboardTab('Profile'); window.location.hash = '/'; setRoute('/'); }} className={`rounded-full px-3 py-2 transition ${activeNav === 'Home' ? 'bg-cyan-400/15 text-cyan-200' : 'hover:bg-slate-800/60 hover:text-white'}`}>Home</button>
            </nav>
          )}

          {token && (
            <div className="ml-auto hidden items-center gap-3 md:flex">
              {user?.role !== 'admin' && <>
                <button type="button" onClick={goToWatchlists} className={`rounded-full border px-3 py-2 text-sm transition ${activeNav === 'Watchlist' ? 'border-cyan-400/80 bg-cyan-500/15 text-cyan-200' : 'border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-cyan-400/80 hover:text-white'}`}>Watchlist</button>
                <button type="button" onClick={() => goToDashboardTab('History')} className={`rounded-full border px-3 py-2 text-sm transition ${activeNav === 'History' ? 'border-cyan-400/80 bg-cyan-500/15 text-cyan-200' : 'border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-cyan-400/80 hover:text-white'}`}>History</button>
                <button type="button" onClick={() => goToDashboardTab('Friends')} className={`rounded-full border px-3 py-2 text-sm transition ${activeNav === 'Friends' ? 'border-cyan-400/80 bg-cyan-500/15 text-cyan-200' : 'border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-cyan-400/80 hover:text-white'}`}>Friends</button>
              </>}
              <button type="button" onClick={goToProfile} title="Open profile" aria-label="Open profile" className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border p-0 transition ${activeNav === 'Profile' ? 'border-cyan-400/80 bg-cyan-400 text-slate-950 hover:bg-cyan-300' : 'border-slate-300/20 bg-slate-100 text-slate-900 hover:bg-white'}`}>
                {user?.profile_image ? <img src={normalizeImage(user.profile_image)} alt="Profile" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <UserRound className="h-5 w-5" />}
              </button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {token && <div className="relative md:hidden"><button type="button" onClick={() => setMobileMenuOpen((current) => !current)} className="rounded-full border border-slate-700/80 bg-slate-900/40 p-2 text-slate-200" aria-label="Open navigation"><Menu className="h-4 w-4" /></button>{mobileMenuOpen && <div className="absolute right-0 top-12 z-50 grid w-48 gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-2xl"><button type="button" onClick={() => { setMobileMenuOpen(false); setActiveNav('Home'); setRoute('/'); }} className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">Home</button>{user?.role !== 'admin' && <><button type="button" onClick={() => { setMobileMenuOpen(false); goToWatchlists(); }} className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">Watchlist</button><button type="button" onClick={() => { setMobileMenuOpen(false); goToDashboardTab('History'); }} className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">History</button><button type="button" onClick={() => { setMobileMenuOpen(false); goToDashboardTab('Friends'); }} className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">Friends</button></>}{user?.role === 'admin' && <button type="button" onClick={() => { setMobileMenuOpen(false); setRoute('/admin'); }} className="rounded-xl px-3 py-2 text-left text-sm text-cyan-200 hover:bg-slate-800">Admin</button>}</div>}</div>}
            {token && <div ref={notificationMenuRef} className="relative">
              <button type="button" onClick={() => setNotificationsOpen((current) => !current)} className="relative rounded-full border border-slate-700/80 bg-slate-900/40 p-2 text-slate-200 transition hover:border-cyan-400/70 hover:text-white"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
              {notificationsOpen && <div className="glass-panel absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-800/80 p-3 shadow-2xl sm:w-96">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3"><h3 className="font-semibold text-white">Notifications</h3><button type="button" onClick={markAllNotificationsRead} className="text-xs text-cyan-300 hover:text-cyan-200">Mark all as read</button></div>
                <div className="mt-2 max-h-80 overflow-y-auto">{notifications.length ? notifications.map((notification) => {
                  const text = notification.notification_type === 'friend_request' ? `${notification.user_name} sent you a friend request` : notification.notification_type === 'friend_accepted' ? `${notification.user_name} accepted your friend request` : `${notification.user_name} shared "${notification.watchlist_name}" with you`;
                  return <div key={notification.notification_id} className={`flex items-start gap-2 rounded-xl p-3 transition hover:bg-slate-800/60 ${notification.is_read ? 'opacity-55' : 'bg-cyan-500/5'}`}><button type="button" onClick={() => handleNotificationClick(notification)} className="min-w-0 flex-1 text-left"><p className="text-sm text-slate-200">{text}</p><p className="mt-1 text-xs text-slate-500">{timeAgo(notification.created_at)}</p></button><button type="button" onClick={() => deleteNotification(notification.notification_id)} className="p-1 text-xs text-rose-300" aria-label="Delete notification">×</button></div>;
                }) : <p className="p-4 text-center text-sm text-slate-400">You are all caught up.</p>}</div>
              </div>}
            </div>}
            {token && <button type="button" onClick={handleLogout} className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20">Logout</button>}
          </div>
        </header>

        {renderRoute()}
      </div>

      {watchlistPickerMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => { if (!watchlistSaving) setWatchlistPickerMovie(null); }}>
          <div className="w-full max-w-md rounded-[28px] border border-slate-700 bg-slate-950 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Save movie</p>
                <h2 className="mt-2 text-xl font-bold text-white">Choose a watchlist</h2>
                <p className="mt-1 truncate text-sm text-slate-400">{watchlistPickerMovie.title}</p>
              </div>
              <button type="button" onClick={() => setWatchlistPickerMovie(null)} disabled={watchlistSaving} className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white disabled:opacity-50" aria-label="Close watchlist picker"><X className="h-4 w-4" /></button>
            </div>

            {watchlistPickerLoading ? (
              <div className="mt-6 text-sm text-slate-400">Loading watchlists...</div>
            ) : (
              <>
                <div className="mt-5 max-h-48 space-y-2 overflow-y-auto">
                  {watchlists.length ? watchlists.map((list) => (
                    <button key={list.watchlist_id} type="button" onClick={() => saveMovieToWatchlist(list.watchlist_id)} disabled={watchlistSaving} className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-left text-sm text-white transition hover:border-cyan-400/70 hover:bg-cyan-500/10 disabled:opacity-50">
                      <span className="font-semibold">{list.name}</span>
                      <span className="text-xs text-slate-400">{list.movie_count ?? list.movies?.length ?? 0} movies</span>
                    </button>
                  )) : <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No watchlists yet. Create one below.</p>}
                </div>

                <div className="mt-5 border-t border-slate-800 pt-5">
                  <p className="text-sm font-semibold text-white">Create a new watchlist</p>
                  <div className="mt-3 flex gap-2">
                    <input value={newWatchlistName} onChange={(event) => setNewWatchlistName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveMovieToWatchlist(); } }} placeholder="e.g. Weekend picks" className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/80" />
                    <button type="button" onClick={() => saveMovieToWatchlist()} disabled={watchlistSaving || !newWatchlistName.trim()} className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{watchlistSaving ? 'Saving...' : 'Create & save'}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed right-5 top-24 z-50 rounded-full border px-4 py-2 text-sm shadow-lg ${toast.type === 'error' ? 'border-rose-400/50 bg-rose-500/15 text-rose-100' : 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;