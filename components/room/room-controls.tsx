'use client';

import { useState } from 'react';
import type { RoomStatus } from '@/lib/types/room';
import {
  startRoom,
  pauseRoom,
  resumeRoom,
  stopRoom,
} from '@/lib/api/rooms';

interface RoomControlsProps {
  workspaceId: string;
  roomId: string;
  status: RoomStatus;
  token: string;
  hasPendingInvites: boolean;
  onStatusChange: (status: RoomStatus) => void;
}

export function RoomControls({
  workspaceId,
  roomId,
  status,
  token,
  hasPendingInvites,
  onStatusChange,
}: RoomControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(
    action: 'start' | 'pause' | 'resume' | 'stop',
  ) {
    setLoading(action);
    try {
      const fns = { start: startRoom, pause: pauseRoom, resume: resumeRoom, stop: stopRoom };
      const room = await fns[action](workspaceId, roomId, token);
      onStatusChange(room.status as RoomStatus);
    } catch (err) {
      console.error(`Failed to ${action} room:`, err);
    } finally {
      setLoading(null);
    }
  }

  const btn =
    'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-2">
      {status === 'IDLE' && hasPendingInvites && (
        <span className="inline-flex items-center gap-1.5 text-sm text-amber-600">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Waiting for invitees...
        </span>
      )}

      {status === 'IDLE' && !hasPendingInvites && (
        <button
          className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          onClick={() => handleAction('start')}
          disabled={loading !== null}
        >
          {loading === 'start' ? 'Starting...' : 'Start'}
        </button>
      )}

      {status === 'RUNNING' && (
        <>
          <button
            className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}
            onClick={() => handleAction('pause')}
            disabled={loading !== null}
          >
            {loading === 'pause' ? 'Pausing...' : 'Pause'}
          </button>
          <button
            className={`${btn} bg-red-600 text-white hover:bg-red-700`}
            onClick={() => handleAction('stop')}
            disabled={loading !== null}
          >
            {loading === 'stop' ? 'Stopping...' : 'Stop'}
          </button>
        </>
      )}

      {status === 'PAUSED' && (
        <>
          <button
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
            onClick={() => handleAction('resume')}
            disabled={loading !== null}
          >
            {loading === 'resume' ? 'Resuming...' : 'Resume'}
          </button>
          <button
            className={`${btn} bg-red-600 text-white hover:bg-red-700`}
            onClick={() => handleAction('stop')}
            disabled={loading !== null}
          >
            {loading === 'stop' ? 'Stopping...' : 'Stop'}
          </button>
        </>
      )}

      {status === 'CLOSED' && (
        <span className="text-sm text-zinc-400">Conversation ended</span>
      )}
    </div>
  );
}
