import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('cineverse_user');

      if (!window.location.hash || window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }

    return Promise.reject(error);
  },
);

export default API;

export const authApi = {
  login: (payload) => API.post('/auth/login', payload),
  register: (payload) => API.post('/auth/register', payload),
  logout: () => API.post('/auth/logout'),
  profile: () => API.get('/auth/profile'),
  updateProfile: (payload) => API.put('/auth/profile', payload),
};

export const userApi = {
  getProfile: () => API.get('/users/profile'),
  updateProfile: (payload) => API.put('/users/profile', payload),
  search: (params = {}) => API.get('/users/search', { params }),
  getById: (userId) => API.get(`/users/${userId}`),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profile_image', file);
    return API.post('/users/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeProfilePicture: () => API.delete('/users/profile-picture'),
};

export const movieApi = {
  getAll: (params = {}) => API.get('/movies', { params }),
  search: (params = {}) => API.get('/movies/search', { params }),
  recommendations: (params = {}) => API.get('/movies/recommendations', { params }),
  getById: (movieId) => API.get(`/movies/${movieId}`),
  create: (payload) => API.post('/movies', payload),
  update: (movieId, payload) => API.put(`/movies/${movieId}`, payload),
  addImage: (movieId, payload) => API.post(`/movies/${movieId}/images`, payload),
  removeImage: (movieId, imageId) => API.delete(`/movies/${movieId}/images/${imageId}`),
  remove: (movieId) => API.delete(`/movies/${movieId}`),
};

export const genreApi = {
  getAll: () => API.get('/genres'),
  getById: (genreId) => API.get(`/genres/${genreId}`),
  create: (payload) => API.post('/genres', payload),
  update: (genreId, payload) => API.put(`/genres/${genreId}`, payload),
  remove: (genreId) => API.delete(`/genres/${genreId}`),
  attachToMovie: (movieId, payload) => API.post(`/genres/movies/${movieId}`, payload),
  removeFromMovie: (movieId, genreId) => API.delete(`/genres/movies/${movieId}/${genreId}`),
};

export const reviewApi = {
  listByMovie: (movieId) => API.get(`/reviews/movie/${movieId}`),
  create: (payload) => API.post('/reviews', payload),
  update: (reviewId, payload) => API.put(`/reviews/${reviewId}`, payload),
  remove: (reviewId) => API.delete(`/reviews/${reviewId}`),
};

export const watchHistoryApi = {
  getAll: () => API.get('/watch-history'),
  add: (payload) => API.post('/watch-history', payload),
  updateProgress: (historyId, payload) => API.put(`/watch-history/${historyId}/progress`, payload),
  remove: (historyId) => API.delete(`/watch-history/${historyId}`),
};

export const watchlistApi = {
  getAll: () => API.get('/watchlists'),
  getById: (watchlistId) => API.get(`/watchlists/${watchlistId}`),
  create: (payload) => API.post('/watchlists', payload),
  update: (watchlistId, payload) => API.put(`/watchlists/${watchlistId}`, payload),
  remove: (watchlistId) => API.delete(`/watchlists/${watchlistId}`),
  addMovie: (watchlistId, payload) => API.post(`/watchlists/${watchlistId}/movies`, payload),
  removeMovie: (watchlistId, movieId) => API.delete(`/watchlists/${watchlistId}/movies/${movieId}`),
  share: (watchlistId, payload) => API.post(`/watchlists/${watchlistId}/share`, payload),
  getSharedWithMe: () => API.get('/watchlists/shared-with-me'),
  getSharedWatchlist: (id) => API.get(`/watchlists/shared/${id}`),
};

export const friendshipApi = {
  getFriends: () => API.get('/friendships'),
  getPending: () => API.get('/friendships/pending'),
  getSent: () => API.get('/friendships/sent'),
  lookupUserByEmail: (email) => API.get('/friendships/lookup', { params: { email } }),
  sendRequest: (payload) => API.post('/friendships', payload),
  respond: (friendshipId, payload) => API.put(`/friendships/${friendshipId}`, payload),
  remove: (friendshipId) => API.delete(`/friendships/${friendshipId}`),
};

export const notificationApi = {
  getAll: () => API.get('/notifications'),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/read-all'),
  remove: (id) => API.delete(`/notifications/${id}`),
};

export const personApi = {
  getAll: () => API.get('/persons'),
  create: (payload) => API.post('/persons', payload),
  update: (personId, payload) => API.put(`/persons/${personId}`, payload),
  remove: (personId) => API.delete(`/persons/${personId}`),
  addMovieCredit: (movieId, payload) => API.post(`/persons/movies/${movieId}/credits`, payload),
  removeMovieCredit: (movieId, personId, creditType) => API.delete(`/persons/movies/${movieId}/credits/${personId}/${encodeURIComponent(creditType)}`),
};

export const streamingPlatformApi = {
  getAll: () => API.get('/streaming-platforms'),
  create: (payload) => API.post('/streaming-platforms', payload),
  update: (platformId, payload) => API.put(`/streaming-platforms/${platformId}`, payload),
  remove: (platformId) => API.delete(`/streaming-platforms/${platformId}`),
  attachToMovie: (movieId, payload) => API.post(`/streaming-platforms/movies/${movieId}`, payload),
  removeFromMovie: (movieId, platformId) => API.delete(`/streaming-platforms/movies/${movieId}/${platformId}`),
};
