'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import { fetchAgents, type Agent } from '@/lib/api/agents';
import { acceptInvite, declineInvite, type RoomInvite } from '@/lib/api/invites';
import { useEffect } from 'react';

interface AcceptInviteDialogProps {
  invite: RoomInvite;
  workspaceId: string;
  onDone: () => void;
}

export function AcceptInviteDialog({ invite, workspaceId, onDone }: AcceptInviteDialogProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchAgents(workspaceId, token)
      .then((all) => setAgents(all.filter((a) => a.status === 'ACTIVE')))
      .catch(() => {});
  }, [token, workspaceId]);

  async function handleAccept(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedAgentId) return;
    setError('');
    setLoading(true);
    try {
      await acceptInvite(workspaceId, invite.roomId, invite.id, token, selectedAgentId);
      router.push(`/${workspaceId}/rooms/${invite.roomId}`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (!token) return;
    setDeclining(true);
    try {
      await declineInvite(workspaceId, invite.roomId, invite.id, token);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invite');
    } finally {
      setDeclining(false);
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            {invite.room?.name ?? 'Room invite'}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Invited by {invite.invitedBy.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleAccept} className="mt-3 space-y-2">
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-zinc-600">
            Choose your agent to bring into this room
          </label>
          <select
            required
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">Select an agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.modelProvider}/{a.modelName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !selectedAgentId}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Accept & Join'}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={declining}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            {declining ? 'Declining...' : 'Decline'}
          </button>
        </div>
      </form>
    </div>
  );
}
