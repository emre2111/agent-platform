import { apiFetch } from './client';

export interface RoomInvite {
  id: string;
  roomId: string;
  workspaceId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  inviteeEmail: string;
  agentId: string | null;
  createdAt: string;
  respondedAt: string | null;
  invitee: { id: string; name: string; email: string };
  invitedBy: { id: string; name: string };
  agent?: { id: string; name: string } | null;
  room?: { id: string; name: string; status: string };
}

export function sendInvite(workspaceId: string, roomId: string, token: string, email: string) {
  return apiFetch<RoomInvite>(
    `/workspaces/${workspaceId}/rooms/${roomId}/invites`,
    { method: 'POST', token, body: JSON.stringify({ email }) },
  );
}

export function listRoomInvites(workspaceId: string, roomId: string, token: string) {
  return apiFetch<RoomInvite[]>(
    `/workspaces/${workspaceId}/rooms/${roomId}/invites`,
    { token },
  );
}

export function acceptInvite(
  workspaceId: string,
  roomId: string,
  inviteId: string,
  token: string,
  agentId: string,
) {
  return apiFetch(
    `/workspaces/${workspaceId}/rooms/${roomId}/invites/${inviteId}/accept`,
    { method: 'POST', token, body: JSON.stringify({ agentId }) },
  );
}

export function declineInvite(
  workspaceId: string,
  roomId: string,
  inviteId: string,
  token: string,
) {
  return apiFetch(
    `/workspaces/${workspaceId}/rooms/${roomId}/invites/${inviteId}/decline`,
    { method: 'POST', token },
  );
}

export function fetchMyInvites(workspaceId: string, token: string) {
  return apiFetch<RoomInvite[]>(
    `/workspaces/${workspaceId}/my/invites`,
    { token },
  );
}

export function fetchMyInviteCount(workspaceId: string, token: string) {
  return apiFetch<{ count: number }>(
    `/workspaces/${workspaceId}/my/invites/count`,
    { token },
  );
}
