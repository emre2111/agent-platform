import { RoomStatusBadge } from './room-status-badge';
import type { Room, RoomStatus } from '@/lib/types/room';

interface RoomHeaderProps {
  room: Room;
  currentStatus: RoomStatus;
}

export function RoomHeader({ room, currentStatus }: RoomHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-zinc-900">{room.name}</h1>
        <RoomStatusBadge status={currentStatus} />
      </div>

      {room.description && (
        <p className="mt-1 text-sm text-zinc-500">{room.description}</p>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
        <span>Policy: {room.turnPolicy.replace('_', ' ').toLowerCase()}</span>
        <span>Turn {room.turnCount}{room.maxTurns ? ` / ${room.maxTurns}` : ''}</span>
        {room.closedReason && (
          <span className="text-red-400">
            Closed: {room.closedReason.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    </div>
  );
}
