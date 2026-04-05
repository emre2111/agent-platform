import { apiFetch } from './client';

export interface Agent {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  modelProvider: string;
  modelName: string;
  modelConfig: Record<string, unknown>;
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  isPublic: boolean;
  createdAt: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  systemPrompt: string;
  modelProvider: string;
  modelName: string;
  modelConfig?: Record<string, unknown>;
  isPublic?: boolean;
}

export function fetchAgents(workspaceId: string, token: string) {
  return apiFetch<Agent[]>(`/workspaces/${workspaceId}/agents`, { token });
}

export function fetchAgent(workspaceId: string, agentId: string, token: string) {
  return apiFetch<Agent>(`/workspaces/${workspaceId}/agents/${agentId}`, { token });
}

export function createAgent(workspaceId: string, token: string, data: CreateAgentInput) {
  return apiFetch<Agent>(`/workspaces/${workspaceId}/agents`, {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateAgent(workspaceId: string, agentId: string, token: string, data: Partial<CreateAgentInput>) {
  return apiFetch<Agent>(`/workspaces/${workspaceId}/agents/${agentId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function activateAgent(workspaceId: string, agentId: string, token: string) {
  return apiFetch<Agent>(`/workspaces/${workspaceId}/agents/${agentId}/activate`, {
    method: 'POST',
    token,
  });
}

export function archiveAgent(workspaceId: string, agentId: string, token: string) {
  return apiFetch<Agent>(`/workspaces/${workspaceId}/agents/${agentId}`, {
    method: 'DELETE',
    token,
  });
}

export interface CredentialInfo {
  id: string;
  provider: string;
  keyFingerprint: string;
  createdAt: string;
}

export function fetchCredentials(workspaceId: string, agentId: string, token: string) {
  return apiFetch<CredentialInfo[]>(`/workspaces/${workspaceId}/agents/${agentId}/credentials`, { token });
}

export function setCredential(workspaceId: string, agentId: string, token: string, provider: string, apiKey: string) {
  return apiFetch(`/workspaces/${workspaceId}/agents/${agentId}/credentials`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ provider, apiKey }),
  });
}
