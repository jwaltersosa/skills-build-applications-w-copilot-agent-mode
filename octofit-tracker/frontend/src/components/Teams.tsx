import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = {
  name: string;
  mascot: string;
  members: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getJson<{ teams: Team[] }>('/api/teams')
      .then((payload) => {
        if (!active) return;
        setTeams(payload.teams ?? []);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setTeams([]);
        setError('Unable to load teams.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      {loading && <p role="status">Loading teams...</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && teams.length === 0 && <p>No teams</p>}
      {!loading && !error && teams.length > 0 && (
        <ul className="list-group list-group-flush">
          {teams.map((team, index) => (
            <li className="list-group-item" key={`${team.name}-${index}`}>
              <strong>{team.name}</strong> ({team.mascot})
              <div className="text-muted">Members: {team.members.join(', ') || 'No members yet'}</div>
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
