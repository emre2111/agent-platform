'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import { createAgent } from '@/lib/api/agents';

export default function CreateAgentPage() {
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const { token } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelProvider, setModelProvider] = useState('openai');
  const [modelName, setModelName] = useState('gpt-4o');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('1024');
  const [isPublic, setIsPublic] = useState(true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const agent = await createAgent(params.workspaceId, token, {
        name,
        description: description || undefined,
        systemPrompt,
        modelProvider,
        modelName,
        modelConfig: {
          temperature: parseFloat(temperature),
          maxTokens: parseInt(maxTokens),
        },
        isPublic,
      });
      router.push(`/${params.workspaceId}/agents/${agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-zinc-900 mb-6">Create Agent</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700">Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="Research Analyst" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">System Prompt</label>
          <textarea required rows={4} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="You are a..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Provider</label>
            <select value={modelProvider} onChange={(e) => setModelProvider(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Model</label>
            <input type="text" required value={modelName} onChange={(e) => setModelName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Temperature</label>
            <input type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Max Tokens</label>
            <input type="number" min="1" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-zinc-300" />
          <label htmlFor="isPublic" className="text-sm text-zinc-700">Visible to all workspace members</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Agent'}
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
