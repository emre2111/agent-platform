'use client';

import type { RoomInvite } from '@/lib/api/invites';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-zinc-100 text-zinc-500',
  EXPIRED: 'bg-red-100 text-red-600',
};

interface InviteListProps {
  invites: RoomInvite[];
}

export function InviteList({ invites }: InviteListProps) {
  if (invites.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Invites</h3>
      {invites.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between rounded border border-zinc-200 bg-white px-3 py-2"
        >
          <div>
            <span className="text-sm font-medium text-zinc-800">{inv.invitee.name}</span>
            <span className="ml-1 text-xs text-zinc-400">{inv.invitee.email}</span>
          </div>
          <div className="flex items-center gap-2">
            {inv.agent && (
              <span className="text-xs text-violet-600">{inv.agent.name}</span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? ''}`}
            >
              {inv.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
