// ─── Server → Client events ────────────────────────────────────

export interface MessagePayload {
  id: string;
  roomId: string;
  senderType: 'USER' | 'AGENT' | 'SYSTEM';
  senderUserId: string | null;
  senderAgentId: string | null;
  senderName: string;
  turnNumber: number;
  content: string;
  tokenCount: number | null;
  createdAt: string;
}

export interface TurnStartedPayload {
  roomId: string;
  turnNumber: number;
  agentId: string;
  agentName: string;
}

export interface TurnErrorPayload {
  roomId: string;
  turnNumber: number;
  agentId: string;
  error: string;
}

export interface RoomStatusPayload {
  roomId: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'CLOSED';
  reason?: string;
}

export interface ServerToClientEvents {
  'message.new': (payload: MessagePayload) => void;
  'turn.started': (payload: TurnStartedPayload) => void;
  'turn.error': (payload: TurnErrorPayload) => void;
  'room.status': (payload: RoomStatusPayload) => void;
  'error': (payload: { code: string; message: string }) => void;
}

// ─── Client → Server events ────────────────────────────────────

export interface SubscribeRoomPayload {
  roomId: string;
  workspaceId: string;
  /** ID of the last message the client has. Server confirms subscription. */
  lastSeenMessageId?: string;
}

export interface UnsubscribeRoomPayload {
  roomId: string;
}

export interface ClientToServerEvents {
  'subscribe_room': (
    payload: SubscribeRoomPayload,
    ack: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  'unsubscribe_room': (
    payload: UnsubscribeRoomPayload,
  ) => void;
}

// ─── Socket data attached after auth ───────────────────────────

export interface SocketData {
  userId: string;
  email: string;
}
