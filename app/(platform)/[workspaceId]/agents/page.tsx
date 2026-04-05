'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import { fetchAgents, type Agent } from '@/lib/api/agents';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  DRAFT: 'bg-zinc-100 text-zinc-600',
  DISABLED: 'bg-amber-100 text-amber-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

export default function AgentsPage() {
  const params = useParams<{ workspaceId: string }>();
  const { token } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params.workspaceId) return;
    fetchAgents(params.workspaceId, token)
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, params.workspaceId]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Agents</h1>
        <Link
          href={`/${params.workspaceId}/agents/new`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Create Agent
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500 text-sm">No agents yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/${params.workspaceId}/agents/${agent.id}`}
              className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="text-sm font-semibold text-zinc-900">{agent.name}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[agent.status] ?? ''}`}
                >
                  {agent.status}
                </span>
              </div>
              {agent.description && (
                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{agent.description}</p>
              )}
              <div className="mt-2 text-xs text-zinc-400">
                {agent.modelProvider} / {agent.modelName}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
