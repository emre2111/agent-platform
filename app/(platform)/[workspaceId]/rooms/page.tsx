'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import { fetchRooms } from '@/lib/api/rooms';
import { fetchMyInvites, type RoomInvite } from '@/lib/api/invites';
import { RoomStatusBadge } from '@/components/room/room-status-badge';
import { AcceptInviteDialog } from '@/components/room/accept-invite-dialog';
import type { Room } from '@/lib/types/room';

export default function RoomsPage() {
  const params = useParams<{ workspaceId: string }>();
  const { token } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(() => {
    if (!token || !params.workspaceId) return;
    Promise.all([
      fetchRooms(params.workspaceId, token),
      fetchMyInvites(params.workspaceId, token).catch(() => []),
    ])
      .then(([r, inv]) => {
        setRooms(r);
        setInvites(inv);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, params.workspaceId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Rooms</h1>
        <Link
          href={`/${params.workspaceId}/rooms/new`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Create Room
        </Link>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700">
            Pending Invites ({invites.length})
          </h2>
          {invites.map((inv) => (
            <AcceptInviteDialog
              key={inv.id}
              invite={inv}
              workspaceId={params.workspaceId}
              onDone={loadAll}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400">Loading rooms...</div>
      ) : rooms.length === 0 && invites.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500 text-sm">No rooms yet. Create your first conversation room.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/${params.workspaceId}/rooms/${room.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">{room.name}</span>
                  <RoomStatusBadge status={room.status} />
                </div>
                {room.description && (
                  <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{room.description}</p>
                )}
              </div>
              <div className="text-xs text-zinc-400">
                Turn {room.turnCount}{room.maxTurns ? ` / ${room.maxTurns}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
