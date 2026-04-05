'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import { createRoom } from '@/lib/api/rooms';

export default function CreateRoomPage() {
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [turnPolicy, setTurnPolicy] = useState('ROUND_ROBIN');
  const [maxTurns, setMaxTurns] = useState('20');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const room = await createRoom(params.workspaceId, token, {
        name,
        description: description || undefined,
        turnPolicy,
        maxTurns: maxTurns ? parseInt(maxTurns) : undefined,
      });
      router.push(`/${params.workspaceId}/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-zinc-900 mb-6">Create Room</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700">Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Debate: AI Safety" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Turn Policy</label>
            <select value={turnPolicy} onChange={(e) => setTurnPolicy(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="MODERATED">Moderated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Max Turns</label>
            <input type="number" min="1" value={maxTurns} onChange={(e) => setMaxTurns(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Room'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
