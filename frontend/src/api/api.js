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

    if (status === 401 || status === 403) {
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

export const movieApi = {
  getAll: (params = {}) => API.get('/movies', { params }),
  getById: (movieId) => API.get(`/movies/${movieId}`),
  create: (payload) => API.post('/movies', payload),
};

export const genreApi = {
  getAll: () => API.get('/genres'),
  getById: (genreId) => API.get(`/genres/${genreId}`),
  create: (payload) => API.post('/genres', payload),
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
};

export const personApi = {
  getAll: () => API.get('/persons'),
  create: (payload) => API.post('/persons', payload),
  addMovieCredit: (movieId, payload) => API.post(`/persons/movies/${movieId}/credits`, payload),
};
