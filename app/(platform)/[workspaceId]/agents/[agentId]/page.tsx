'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import {
  fetchAgent,
  activateAgent,
  archiveAgent,
  fetchCredentials,
  setCredential,
  type Agent,
  type CredentialInfo,
} from '@/lib/api/agents';

export default function AgentDetailPage() {
  const params = useParams<{ workspaceId: string; agentId: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [credProvider, setCredProvider] = useState('');
  const [credKey, setCredKey] = useState('');
  const [credError, setCredError] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchAgent(params.workspaceId, params.agentId, token),
      fetchCredentials(params.workspaceId, params.agentId, token).catch(() => []),
    ])
      .then(([a, c]) => {
        setAgent(a);
        setCredentials(c);
      })
      .finally(() => setLoading(false));
  }, [token, params.workspaceId, params.agentId]);

  async function handleActivate() {
    if (!token || !agent) return;
    const updated = await activateAgent(params.workspaceId, agent.id, token);
    setAgent(updated);
  }

  async function handleArchive() {
    if (!token || !agent) return;
    await archiveAgent(params.workspaceId, agent.id, token);
    router.push(`/${params.workspaceId}/agents`);
  }

  async function handleSetCredential(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCredError('');
    setCredLoading(true);
    try {
      await setCredential(params.workspaceId, params.agentId, token, credProvider, credKey);
      const updated = await fetchCredentials(params.workspaceId, params.agentId, token);
      setCredentials(updated);
      setCredProvider('');
      setCredKey('');
    } catch (err) {
      setCredError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setCredLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-zinc-400">Loading agent...</div>;
  }

  if (!agent) {
    return <div className="p-8 text-sm text-red-600">Agent not found.</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{agent.name}</h1>
            {agent.description && <p className="mt-1 text-sm text-zinc-500">{agent.description}</p>}
          </div>
          <div className="flex gap-2">
            {agent.status === 'DRAFT' && (
              <button onClick={handleActivate}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                Activate
              </button>
            )}
            {agent.status !== 'ARCHIVED' && (
              <button onClick={handleArchive}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                Archive
              </button>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500">Status</dt>
          <dd className="font-medium text-zinc-800">{agent.status}</dd>
          <dt className="text-zinc-500">Provider</dt>
          <dd className="font-medium text-zinc-800">{agent.modelProvider}</dd>
          <dt className="text-zinc-500">Model</dt>
          <dd className="font-medium text-zinc-800">{agent.modelName}</dd>
          <dt className="text-zinc-500">Public</dt>
          <dd className="font-medium text-zinc-800">{agent.isPublic ? 'Yes' : 'No'}</dd>
        </dl>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-zinc-500">System Prompt</h3>
          <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 text-sm text-zinc-800">
            {agent.systemPrompt}
          </pre>
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-3">Credentials</h2>
        {credentials.length > 0 && (
          <ul className="mb-4 space-y-2">
            {credentials.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2">
                <span className="text-sm font-medium text-zinc-800">{c.provider}</span>
                <span className="text-xs text-zinc-400 font-mono">...{c.keyFingerprint}</span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSetCredential} className="flex items-end gap-2">
          {credError && <div className="text-xs text-red-600">{credError}</div>}
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-600">Provider</label>
            <input type="text" required value={credProvider} onChange={(e) => setCredProvider(e.target.value)}
              className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" placeholder="openai" />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs font-medium text-zinc-600">API Key</label>
            <input type="password" required value={credKey} onChange={(e) => setCredKey(e.target.value)}
              className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" placeholder="sk-..." />
          </div>
          <button type="submit" disabled={credLoading}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {credLoading ? '...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
