import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = {
  type: string;
  minutes: number;
  points: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getJson<{ activities: Activity[] }>('/api/activities')
      .then((payload) => {
        if (!active) return;
        setActivities(payload.activities ?? []);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setActivities([]);
        setError('Unable to load activities.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points.">
      {loading && <p role="status">Loading activities...</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && activities.length === 0 && <p>No activities</p>}
      {!loading && !error && activities.length > 0 && (
        <ul className="list-group list-group-flush">
          {activities.map((activity, index) => (
            <li className="list-group-item" key={`${activity.type}-${index}`}>
              {activity.type} · {activity.minutes} min · {activity.points} pts
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
