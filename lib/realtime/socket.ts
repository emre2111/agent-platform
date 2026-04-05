import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000";

let socket: Socket | null = null;
let gaveUp = false;

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  // Don't keep recreating sockets after we've given up
  if (socket && gaveUp) return socket;

  socket = io(`${WS_URL}/ws`, {
    query: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10_000,
    reconnectionAttempts: 3,
  });

  socket.on("reconnect_failed", () => {
    gaveUp = true;
    console.warn(
      "[ws] Realtime connection unavailable – falling back to polling",
    );
  });

  return socket;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  gaveUp = false;
}
