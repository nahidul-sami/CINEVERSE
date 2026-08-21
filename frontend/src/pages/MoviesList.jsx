import React, { useState, useEffect } from 'react';
import { getAllMovies } from '../api/movieApi';

function MoviesList() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const result = await getAllMovies();
        setMovies(result.data);
      } catch (err) {
        setError('Failed to load movies');
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) return <p style={{ textAlign: 'center', color: '#fff' }}>Loading movies...</p>;
  if (error) return <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#fff' }}>Movies</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}
      >
        {movies.map((movie) => (
          <div
            key={movie.movie_id}
            style={{
              border: '1px solid #333',
              borderRadius: '10px',
              padding: '16px',
              background: '#1e293b',
              color: '#fff'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>{movie.title}</h3>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#94a3b8' }}>
              {movie.release_year} • {movie.duration} min
            </p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>⭐ {movie.rating}</p>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#cbd5e1' }}>
              {movie.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MoviesList;