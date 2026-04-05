'use client';

import { useState, type FormEvent } from 'react';
import { sendInvite } from '@/lib/api/invites';

interface InviteFormProps {
  workspaceId: string;
  roomId: string;
  token: string;
  onInviteSent: () => void;
}

export function InviteForm({ workspaceId, roomId, token, onInviteSent }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const invite = await sendInvite(workspaceId, roomId, token, email.trim());
      setSuccess(`Invite sent to ${invite.invitee.name}`);
      setEmail('');
      onInviteSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-600">Invite by email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="bob@acme.com"
            className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Invite'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-600">{success}</p>}
    </form>
  );
}
