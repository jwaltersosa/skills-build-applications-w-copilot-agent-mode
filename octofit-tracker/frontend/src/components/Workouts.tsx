import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const userEmail = 'mona@example.com';

    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then((payload) => {
        if (!active) return;
        setSuggestions(payload.suggestions ?? []);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setSuggestions([]);
        setError('Unable to load workout suggestions.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      {loading && <p role="status">Loading workout suggestions...</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && suggestions.length === 0 && <p>No workout suggestions</p>}
      {!loading && !error && suggestions.length > 0 && (
        <ul className="list-group list-group-flush">
          {suggestions.map((suggestion, index) => (
            <li className="list-group-item" key={`${suggestion.title}-${index}`}>
              <strong>{suggestion.title}</strong>
              {suggestion.focus && <div className="text-muted">Focus: {suggestion.focus}</div>}
              {suggestion.reason && <div>{suggestion.reason}</div>}
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
