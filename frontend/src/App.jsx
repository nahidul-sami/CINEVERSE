import React, { useState, useEffect } from 'react';
import Profile from './pages/Profile';
import { loginUser, registerUser } from './api/authApi';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const payload = { email: form.email, password: form.password };
      const result = mode === 'login'
        ? await loginUser(payload)
        : await registerUser({ ...form, role: 'user' });

      const userToken = result?.data?.token;

      if (userToken) {
        setToken(userToken);
        setMessage(mode === 'login' ? 'Login successful!' : 'Registration successful!');
        setForm({ name: '', email: '', password: '' });
        return;
      }

      setMessage(mode === 'login' ? 'Login successful.' : 'Registration successful. Please log in.');
      setMode('login');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong';
      setError(msg);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setMessage('Logged out successfully');
  };

  if (token) {
    return <Profile onLogout={handleLogout} />;
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: 24, border: '1px solid #ddd', borderRadius: 12 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>{mode === 'login' ? 'Login' : 'Register'}</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button" onClick={() => setMode('login')} style={{ flex: 1, padding: 10 }}>Login</button>
        <button type="button" onClick={() => setMode('register')} style={{ flex: 1, padding: 10 }}>Register</button>
      </div>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, boxSizing: 'border-box' }}
            />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 10, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 10, boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: 12, cursor: 'pointer' }}>
          {mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

export default App;