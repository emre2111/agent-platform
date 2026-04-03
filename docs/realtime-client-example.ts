/**
 * ──────────────────────────────────────────────────────────────
 * REFERENCE: Frontend WebSocket client for the agent platform.
 *
 * This file is NOT part of the backend build. It's a reference
 * implementation showing how a React/Next.js frontend would
 * connect to the realtime gateway.
 *
 * Install on the frontend: npm install socket.io-client
 *
 * The event types can be shared by publishing them as a package
 * or copying src/realtime/events.ts to the frontend project.
 * ──────────────────────────────────────────────────────────────
 */

// import { io, Socket } from 'socket.io-client';

// ─── Shared event types (copied from src/realtime/events.ts) ──

interface MessagePayload {
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

interface ServerToClientEvents {
  'message.new': (payload: MessagePayload) => void;
  'turn.started': (payload: { roomId: string; turnNumber: number; agentId: string; agentName: string }) => void;
  'turn.error': (payload: { roomId: string; turnNumber: number; agentId: string; error: string }) => void;
  'room.status': (payload: { roomId: string; status: string; reason?: string }) => void;
  'error': (payload: { code: string; message: string }) => void;
}

interface ClientToServerEvents {
  'subscribe_room': (
    payload: { roomId: string; workspaceId: string },
    ack: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  'unsubscribe_room': (payload: { roomId: string }) => void;
}

// type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ─── 1. Connection ─────────────────────────────────────────────
//
// function createRealtimeClient(apiUrl: string, token: string): RealtimeSocket {
//   const socket: RealtimeSocket = io(`${apiUrl}/ws`, {
//     query: { token },
//     transports: ['websocket', 'polling'],
//     reconnection: true,
//     reconnectionDelay: 1000,
//     reconnectionDelayMax: 10000,
//     reconnectionAttempts: Infinity,
//   });
//
//   socket.on('connect', () => console.log('[ws] connected:', socket.id));
//   socket.on('disconnect', (reason) => console.log('[ws] disconnected:', reason));
//   socket.on('error', (err) => console.error('[ws] error:', err.code, err.message));
//
//   return socket;
// }

// ─── 2. Room subscription with idempotent message handling ─────
//
// function subscribeToRoom(
//   socket: RealtimeSocket,
//   roomId: string,
//   workspaceId: string,
//   callbacks: {
//     onMessage: (msg: MessagePayload) => void;
//     onReconnect: () => void;
//   },
// ): () => void {
//   const seenIds = new Set<string>();
//
//   function handleMessage(msg: MessagePayload) {
//     // Idempotency: skip duplicates by message ID
//     if (seenIds.has(msg.id)) return;
//     seenIds.add(msg.id);
//
//     // Cap memory: evict oldest half when set gets large
//     if (seenIds.size > 5000) {
//       const arr = Array.from(seenIds);
//       for (let i = 0; i < 2500; i++) seenIds.delete(arr[i]);
//     }
//
//     callbacks.onMessage(msg);
//   }
//
//   function doSubscribe() {
//     socket.emit('subscribe_room', { roomId, workspaceId }, (res) => {
//       if (!res.ok) console.error('[ws] subscribe failed:', res.error);
//     });
//   }
//
//   socket.on('message.new', handleMessage);
//   doSubscribe();
//   socket.on('connect', () => { doSubscribe(); callbacks.onReconnect(); });
//
//   return () => {
//     socket.emit('unsubscribe_room', { roomId });
//     socket.off('message.new', handleMessage);
//   };
// }

// ─── 3. Message ordering ───────────────────────────────────────
//
// function sortMessages(messages: MessagePayload[]): MessagePayload[] {
//   return [...messages].sort((a, b) => {
//     if (a.turnNumber !== b.turnNumber) return a.turnNumber - b.turnNumber;
//     return a.createdAt.localeCompare(b.createdAt);
//   });
// }

// ─── 4. React hook sketch ──────────────────────────────────────
//
// function useRoomMessages(roomId: string, workspaceId: string) {
//   const [messages, setMessages] = useState<MessagePayload[]>([]);
//   const { token } = useAuth();
//
//   useEffect(() => {
//     if (!token) return;
//     const socket = createRealtimeClient(API_URL, token);
//
//     // Fetch existing messages via REST
//     fetch(`/api/v1/workspaces/${workspaceId}/rooms/${roomId}/messages`)
//       .then(r => r.json())
//       .then(existing => setMessages(sortMessages(existing)));
//
//     // Subscribe to live updates
//     const unsub = subscribeToRoom(socket, roomId, workspaceId, {
//       onMessage: (msg) => setMessages(prev => sortMessages([...prev, msg])),
//       onReconnect: () => {
//         // Gap-fill: fetch messages since last known cursor
//         const lastId = messages[messages.length - 1]?.id;
//         fetch(`/api/v1/.../messages?cursor=${lastId}`)
//           .then(r => r.json())
//           .then(missed => setMessages(prev => sortMessages([...prev, ...missed])));
//       },
//     });
//
//     return () => { unsub(); socket.disconnect(); };
//   }, [token, roomId, workspaceId]);
//
//   return messages;
// }

export {};
