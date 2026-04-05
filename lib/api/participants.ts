import { apiFetch } from './client';
import type { Participant } from '@/lib/types/room';

export function fetchParticipants(workspaceId: string, roomId: string, token: string) {
  return apiFetch<Participant[]>(
    `/workspaces/${workspaceId}/rooms/${roomId}/participants`,
    { token },
  );
}

export function addAgentParticipant(workspaceId: string, roomId: string, token: string, agentId: string) {
  return apiFetch<Participant>(
    `/workspaces/${workspaceId}/rooms/${roomId}/participants/agents`,
    { method: 'POST', token, body: JSON.stringify({ agentId }) },
  );
}

export function addUserParticipant(workspaceId: string, roomId: string, token: string, userId: string, canIntervene: boolean) {
  return apiFetch<Participant>(
    `/workspaces/${workspaceId}/rooms/${roomId}/participants/users`,
    { method: 'POST', token, body: JSON.stringify({ userId, canIntervene }) },
  );
}

export function removeParticipant(workspaceId: string, roomId: string, token: string, participantId: string) {
  return apiFetch(
    `/workspaces/${workspaceId}/rooms/${roomId}/participants/${participantId}`,
    { method: 'DELETE', token },
  );
}
