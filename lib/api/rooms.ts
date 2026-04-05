import { apiFetch } from './client';
import type { Room, Message } from '@/lib/types/room';

export function fetchRooms(workspaceId: string, token: string) {
  return apiFetch<Room[]>(`/workspaces/${workspaceId}/rooms`, { token });
}

export function fetchRoom(workspaceId: string, roomId: string, token: string) {
  return apiFetch<Room>(
    `/workspaces/${workspaceId}/rooms/${roomId}`,
    { token },
  );
}

export function createRoom(
  workspaceId: string,
  token: string,
  data: { name: string; description?: string; turnPolicy?: string; maxTurns?: number },
) {
  return apiFetch<Room>(`/workspaces/${workspaceId}/rooms`, {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteRoom(workspaceId: string, roomId: string, token: string) {
  return apiFetch<void>(
    `/workspaces/${workspaceId}/rooms/${roomId}`,
    { method: 'DELETE', token },
  );
}

export function fetchMessages(
  workspaceId: string,
  roomId: string,
  token: string,
  cursor?: string,
  limit = 50,
) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));

  return apiFetch<Message[]>(
    `/workspaces/${workspaceId}/rooms/${roomId}/messages?${params}`,
    { token },
  );
}

export function startRoom(workspaceId: string, roomId: string, token: string) {
  return apiFetch<Room>(
    `/workspaces/${workspaceId}/rooms/${roomId}/start`,
    { method: 'POST', token },
  );
}

export function pauseRoom(workspaceId: string, roomId: string, token: string) {
  return apiFetch<Room>(
    `/workspaces/${workspaceId}/rooms/${roomId}/pause`,
    { method: 'POST', token },
  );
}

export function resumeRoom(workspaceId: string, roomId: string, token: string) {
  return apiFetch<Room>(
    `/workspaces/${workspaceId}/rooms/${roomId}/resume`,
    { method: 'POST', token },
  );
}

export function stopRoom(workspaceId: string, roomId: string, token: string) {
  return apiFetch<Room>(
    `/workspaces/${workspaceId}/rooms/${roomId}/stop`,
    { method: 'POST', token },
  );
}

export function sendIntervention(
  workspaceId: string,
  roomId: string,
  token: string,
  content: string,
  turnNumber: number,
) {
  return apiFetch<Message>(
    `/workspaces/${workspaceId}/rooms/${roomId}/messages/intervene`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ content, turnNumber }),
    },
  );
}
