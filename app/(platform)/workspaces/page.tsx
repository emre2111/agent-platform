'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/stores/auth-context';
import { createWorkspace } from '@/lib/api/workspaces';

export default function WorkspacesPage() {
  const router = useRouter();
  const { token, workspaces, reloadWorkspaces, setCurrentWorkspace } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const ws = await createWorkspace(token, name, slug);
      await reloadWorkspaces();
      setCurrentWorkspace(ws.id);
      router.push(`/${ws.id}/agents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(id: string) {
    setCurrentWorkspace(id);
    router.push(`/${id}/agents`);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Workspaces</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          New Workspace
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
              }}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="My Team"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="my-team"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {workspaces.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500 text-sm">No workspaces yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelect(ws.id)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900">{ws.name}</div>
                <div className="text-xs text-zinc-400">{ws.slug}</div>
              </div>
              <span className="text-xs text-zinc-400">&rarr;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
