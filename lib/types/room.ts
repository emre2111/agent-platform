export type RoomStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'CLOSED';
export type TurnPolicy = 'ROUND_ROBIN' | 'MODERATED' | 'FREE_FORM';
export type SenderType = 'USER' | 'AGENT' | 'SYSTEM';
export type ParticipantType = 'AGENT' | 'USER';

export interface Room {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  description: string | null;
  status: RoomStatus;
  turnPolicy: TurnPolicy;
  maxTurns: number | null;
  turnCount: number;
  turnDelayMs: number;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  participants: Participant[];
}

export interface Participant {
  id: string;
  roomId: string;
  participantType: ParticipantType;
  seatOrder: number;
  canIntervene: boolean;
  joinedAt: string;
  leftAt: string | null;
  agent: ParticipantAgent | null;
  user: ParticipantUser | null;
}

export interface ParticipantAgent {
  id: string;
  name: string;
  modelProvider: string;
  modelName: string;
  status: string;
}

export interface ParticipantUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  roomId: string;
  senderType: SenderType;
  senderUserId: string | null;
  senderAgentId: string | null;
  senderName?: string;
  senderUser?: { id: string; name: string; avatarUrl?: string | null } | null;
  senderAgent?: { id: string; name: string } | null;
  turnNumber: number;
  content: string;
  tokenCount: number | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface TurnStarted {
  roomId: string;
  turnNumber: number;
  agentId: string;
  agentName: string;
}

export interface TurnError {
  roomId: string;
  turnNumber: number;
  agentId: string;
  error: string;
}

export interface RoomStatusEvent {
  roomId: string;
  status: RoomStatus;
  reason?: string;
}
