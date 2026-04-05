import { clsx } from 'clsx';
import type { RoomStatus } from '@/lib/types/room';

const STATUS_CONFIG: Record<RoomStatus, { label: string; classes: string }> = {
  IDLE:    { label: 'Idle',    classes: 'bg-zinc-100 text-zinc-600' },
  RUNNING: { label: 'Running', classes: 'bg-emerald-100 text-emerald-700' },
  PAUSED:  { label: 'Paused',  classes: 'bg-amber-100 text-amber-700' },
  CLOSED:  { label: 'Closed',  classes: 'bg-red-100 text-red-700' },
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.classes,
      )}
    >
      {status === 'RUNNING' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
