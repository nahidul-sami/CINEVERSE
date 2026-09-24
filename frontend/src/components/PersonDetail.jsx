import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, LoaderCircle, UserRound } from 'lucide-react';
import { personApi } from '../api/api';

const fallbackImage = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde';

const PersonDetail = ({ personId, tmdbId, onBack, onMovieOpen, onPersonOpen }) => {
  const [person, setPerson] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const detailResponse = tmdbId
          ? await personApi.getFromTmdb(tmdbId)
          : await personApi.getDetail(personId);
        const nextPerson = detailResponse.data?.person;
        if (ignore) return;
        setPerson(nextPerson || null);
        if (nextPerson?.person_id) {
          const similarResponse = await personApi.getSimilar(nextPerson.person_id);
          if (!ignore) setSimilar(similarResponse.data?.persons || []);
        }
      } catch (requestError) {
        if (!ignore) setError(requestError?.response?.data?.message || 'Could not load person details.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [personId, tmdbId]);

  if (loading) {
    return <section className="mt-8 space-y-6"><div className="flex items-center gap-3 text-cyan-200"><LoaderCircle className="h-5 w-5 animate-spin" />Fetching details...</div><div className="skeleton h-80 rounded-[28px]" /><div className="skeleton h-48 rounded-[28px]" /></section>;
  }

  if (error || !person) {
    return <section className="mt-8 rounded-[28px] border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100"><p>{error || 'Person not found.'}</p><button type="button" onClick={onBack} className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"><ArrowLeft className="h-4 w-4" />Back</button></section>;
  }

  const image = person.profile_url || fallbackImage;
  const movies = person.movies || [];

  return (
    <section className="mt-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400/70 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to movies</button>
      <div className="glass-panel mt-5 overflow-hidden rounded-[32px] border border-slate-800/80 p-5 shadow-[0_30px_80px_rgba(8,15,30,0.55)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="overflow-hidden rounded-[28px] border border-slate-700/80 bg-slate-900/60 p-2"><img src={image} alt={person.name} className="aspect-[3/4] w-full rounded-[22px] object-cover" onError={(event) => { event.currentTarget.src = fallbackImage; }} /></div>
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl font-black tracking-tight text-white">{person.name}</h1><span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">{person.person_type || 'person'}</span></div>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><CalendarDays className="h-4 w-4 text-cyan-300" />{person.birth_date ? new Date(person.birth_date).toLocaleDateString() : 'Birth date not available'}</p>
            <p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-300">{person.biography || 'No biography is available for this person yet.'}</p>
          </div>
        </div>
      </div>

      <div className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-black text-white">Filmography</h2><span className="text-sm text-slate-400">{movies.length} titles</span></div>{movies.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{movies.map((movie) => <button key={`${movie.movie_id}-${movie.credit_type}`} type="button" onClick={() => onMovieOpen(movie.movie_id)} className="group overflow-hidden rounded-[24px] border border-slate-800/80 bg-slate-900/55 text-left transition hover:-translate-y-1 hover:border-cyan-400/60"><img src={movie.poster_url || fallbackImage} alt={movie.title} className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" /><div className="p-4"><p className="font-semibold text-white">{movie.title}</p><p className="mt-1 text-sm text-slate-400">{movie.release_year || 'N/A'} · {movie.credit_type || 'credit'}</p></div></button>)}</div> : <div className="mt-5 rounded-[24px] border border-dashed border-slate-700 p-6 text-slate-400">No linked movies yet.</div>}</div>

      <div className="mt-10"><h2 className="text-2xl font-black text-white">You may also like</h2>{similar.length ? <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">{similar.map((candidate) => <button key={`${candidate.source}-${candidate.person_id || candidate.tmdb_id}`} type="button" onClick={() => onPersonOpen(candidate)} className="group text-left"><div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60"><img src={candidate.profile_url || fallbackImage} alt={candidate.name} className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = fallbackImage; }} /></div><p className="mt-2 truncate text-sm font-semibold text-white">{candidate.name}</p><p className="text-xs capitalize text-slate-400">{candidate.person_type || 'person'}</p></button>)}</div> : <div className="mt-5 rounded-[24px] border border-dashed border-slate-700 p-6 text-slate-400"><UserRound className="mb-2 h-5 w-5 text-cyan-300" />No similar people found.</div>}</div>
    </section>
  );
};

export default PersonDetail;
