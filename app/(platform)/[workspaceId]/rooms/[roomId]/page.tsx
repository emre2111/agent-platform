'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import { fetchRoom, fetchMessages, deleteRoom } from '@/lib/api/rooms';
import { fetchAgents, type Agent } from '@/lib/api/agents';
import { addAgentParticipant } from '@/lib/api/participants';
import { listRoomInvites, type RoomInvite } from '@/lib/api/invites';
import { RoomLiveView } from '@/components/room/room-live-view';
import { InviteForm } from '@/components/room/invite-form';
import { InviteList } from '@/components/room/invite-list';
import type { Room, Message } from '@/lib/types/room';

export default function RoomDetailPage() {
  const params = useParams<{ workspaceId: string; roomId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [addingAgent, setAddingAgent] = useState(false);
  const [invites, setInvites] = useState<RoomInvite[]>([]);

  const loadData = useCallback(() => {
    if (!token) return;
    Promise.all([
      fetchRoom(params.workspaceId, params.roomId, token),
      fetchMessages(params.workspaceId, params.roomId, token),
      fetchAgents(params.workspaceId, token).catch(() => []),
      listRoomInvites(params.workspaceId, params.roomId, token).catch(() => []),
    ])
      .then(([r, m, a, inv]) => {
        setRoom(r);
        setMessages(m);
        setAgents(a);
        setInvites(inv);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load room'))
      .finally(() => setLoading(false));
  }, [token, params.workspaceId, params.roomId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddAgent() {
    if (!token || !selectedAgentId) return;
    setAddingAgent(true);
    try {
      await addAgentParticipant(params.workspaceId, params.roomId, token, selectedAgentId);
      const updated = await fetchRoom(params.workspaceId, params.roomId, token);
      setRoom(updated);
      setSelectedAgentId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add agent');
    } finally {
      setAddingAgent(false);
    }
  }

  function handleInviteSent() {
    if (!token) return;
    listRoomInvites(params.workspaceId, params.roomId, token)
      .then(setInvites)
      .catch(() => {});
  }

  async function handleDelete() {
    if (!token || !room) return;
    if (!confirm(`Delete room "${room.name}"? All messages will be lost.`)) return;
    try {
      await deleteRoom(params.workspaceId, params.roomId, token);
      router.push(`/${params.workspaceId}/rooms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room');
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-zinc-400">Loading room...</div>;
  }

  if (error || !room) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Room not found'}
        </div>
      </div>
    );
  }

  const isRoomCreator = room.createdById === user?.userId;
  const canInvite = isRoomCreator && (room.status === 'IDLE' || room.status === 'RUNNING');

  const participantAgentIds = new Set(
    room.participants.filter((p) => p.agent).map((p) => p.agent!.id),
  );
  const availableAgents = agents.filter(
    (a) => a.status === 'ACTIVE' && !participantAgentIds.has(a.id),
  );

  const canDelete = isRoomCreator && room.status !== 'RUNNING';

  return (
    <div className="flex h-full flex-col">
      {/* Delete bar */}
      {canDelete && (
        <div className="flex justify-end border-b border-zinc-100 bg-white px-6 py-2">
          <button
            onClick={handleDelete}
            className="rounded px-3 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            Delete Room
          </button>
        </div>
      )}

      {/* Top bar: add agents + invite users */}
      {room.status === 'IDLE' && (
        <div className="border-b border-zinc-200 bg-white px-6 py-3 space-y-3">
          {availableAgents.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Add your agent:</span>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
              >
                <option value="">Select an agent...</option>
                {availableAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.modelProvider})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddAgent}
                disabled={!selectedAgentId || addingAgent}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addingAgent ? 'Adding...' : 'Add'}
              </button>
            </div>
          )}

          {canInvite && (
            <InviteForm
              workspaceId={params.workspaceId}
              roomId={params.roomId}
              token={token!}
              onInviteSent={handleInviteSent}
            />
          )}

          {invites.length > 0 && <InviteList invites={invites} />}
        </div>
      )}

      <div className="flex-1 p-4">
        <RoomLiveView
          room={room}
          initialMessages={messages}
          workspaceId={params.workspaceId}
          token={token!}
          hasPendingInvites={invites.some((i) => i.status === 'PENDING')}
        />
      </div>
    </div>
  );
}
