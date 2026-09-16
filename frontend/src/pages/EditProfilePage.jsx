import { useState } from 'react';
import { Camera, Save, X } from 'lucide-react';
import { userApi } from '../api/api';

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

function EditProfilePage({ user, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    display_name: user?.display_name || user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: form.name,
        display_name: form.display_name,
        username: form.username,
        bio: form.bio,
      };

      const response = await userApi.updateProfile(payload);
      if (file) {
        await userApi.uploadProfilePicture(file);
      }
      onSaved(response.data?.user || user);
    } catch (err) {
      setError(err?.response?.data?.message || 'Profile update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePicture = async () => {
    try {
      await userApi.removeProfilePicture();
      onSaved({ ...user, profile_image: null });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove profile picture');
    }
  };

  return (
    <main className="mx-auto max-w-4xl py-8">
      <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(8,15,30,0.7)]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Profile settings</p>
            <h1 className="mt-2 text-3xl font-black text-white">Edit profile</h1>
          </div>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white"><X className="h-4 w-4" />Cancel</button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-cyan-400/40 bg-slate-900">
              <img src={user?.profile_image ? normalizeImage(user.profile_image) : getDefaultAvatar(user)} alt="Profile" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.src = getDefaultAvatar(user); }} />
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-950">
                <Camera className="h-4 w-4" />
                Upload photo
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
              <button type="button" onClick={handleRemovePicture} className="rounded-full border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-200 hover:border-rose-400/70 hover:text-rose-200">Remove</button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Display name</span>
              <input name="display_name" value={form.display_name} onChange={handleChange} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-white outline-none focus:border-cyan-400/80" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Username</span>
              <input name="username" value={form.username} onChange={handleChange} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-white outline-none focus:border-cyan-400/80" required />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm text-slate-300">Full name</span>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-white outline-none focus:border-cyan-400/80" required />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm text-slate-300">Bio</span>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows="4" className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-white outline-none focus:border-cyan-400/80" placeholder="Tell everyone what kind of movies you love." />
            </label>
          </div>

          {error && <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onCancel} className="rounded-full border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-200">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default EditProfilePage;
