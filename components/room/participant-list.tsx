import { clsx } from 'clsx';
import type { Participant } from '@/lib/types/room';

interface ParticipantListProps {
  participants: Participant[];
}

export function ParticipantList({ participants }: ParticipantListProps) {
  const active = participants.filter((p) => !p.leftAt);

  if (active.length === 0) {
    return (
      <p className="text-sm text-zinc-400">No participants yet.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {active.map((p) => (
        <li key={p.id} className="flex items-center gap-2">
          <div
            className={clsx(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
              p.participantType === 'AGENT'
                ? 'bg-violet-100 text-violet-700'
                : 'bg-blue-100 text-blue-700',
            )}
          >
            {(p.agent?.name ?? p.user?.name ?? '?').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-zinc-800">
              {p.agent?.name ?? p.user?.name ?? 'Unknown'}
            </div>
            <div className="truncate text-xs text-zinc-400">
              {p.participantType === 'AGENT'
                ? `${p.agent?.modelProvider}/${p.agent?.modelName}`
                : p.canIntervene
                  ? 'Can intervene'
                  : 'Observer'}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
