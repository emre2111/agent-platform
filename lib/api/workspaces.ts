import { apiFetch } from './client';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export function fetchWorkspaces(token: string) {
  return apiFetch<Workspace[]>('/workspaces', { token });
}

export function createWorkspace(token: string, name: string, slug: string) {
  return apiFetch<Workspace>('/workspaces', {
    method: 'POST',
    token,
    body: JSON.stringify({ name, slug }),
  });
}
