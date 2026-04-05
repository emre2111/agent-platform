"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket, isSocketConnected } from "./socket";
import { fetchMessages, fetchRoom } from "@/lib/api/rooms";
import type {
  Message,
  RoomStatus,
  TurnStarted,
  TurnError,
  RoomStatusEvent,
} from "@/lib/types/room";

function sortMessages(msgs: Message[]): Message[] {
  return [...msgs].sort((a, b) => {
    if (a.turnNumber !== b.turnNumber) return a.turnNumber - b.turnNumber;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

interface UseRoomSubscriptionOptions {
  roomId: string;
  workspaceId: string;
  token: string;
  initialMessages: Message[];
  initialStatus: RoomStatus;
}

export function useRoomSubscription({
  roomId,
  workspaceId,
  token,
  initialMessages,
  initialStatus,
}: UseRoomSubscriptionOptions) {
  const [messages, setMessages] = useState<Message[]>(() =>
    sortMessages(initialMessages),
  );
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(initialStatus);
  const [activeTurn, setActiveTurn] = useState<TurnStarted | null>(null);
  const [lastError, setLastError] = useState<TurnError | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const seenIds = useRef(new Set(initialMessages.map((m) => m.id)));

  const addMessage = useCallback((msg: Message) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => sortMessages([...prev, msg]));
    setActiveTurn(null);
    setLastError(null);
  }, []);

  useEffect(() => {
    const socket = getSocket(token);

    function subscribe() {
      socket.emit(
        "subscribe_room",
        { roomId, workspaceId },
        (res: { ok: boolean; error?: string }) => {
          if (!res.ok) console.error("[ws] subscribe failed:", res.error);
        },
      );
    }

    function onConnect() {
      setIsConnected(true);
      subscribe();

      // Gap-fill after reconnection
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        fetchMessages(workspaceId, roomId, token, lastMsg.id)
          .then((missed) => {
            for (const m of missed) addMessage(m);
          })
          .catch(() => {});
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onMessage(msg: Message) {
      addMessage(msg);
    }

    function onTurnStarted(data: TurnStarted) {
      setActiveTurn(data);
      setLastError(null);
    }

    function onTurnError(data: TurnError) {
      setActiveTurn(null);
      setLastError(data);
    }

    function onRoomStatus(data: RoomStatusEvent) {
      setRoomStatus(data.status);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message.new", onMessage);
    socket.on("turn.started", onTurnStarted);
    socket.on("turn.error", onTurnError);
    socket.on("room.status", onRoomStatus);

    if (socket.connected) {
      subscribe();
      setIsConnected(true);
    }

    return () => {
      socket.emit("unsubscribe_room", { roomId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message.new", onMessage);
      socket.off("turn.started", onTurnStarted);
      socket.off("turn.error", onTurnError);
      socket.off("room.status", onRoomStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, workspaceId, token]);
  // HTTP polling fallback when WebSocket is unavailable
  useEffect(() => {
    // Only poll when WS is disconnected
    if (isConnected) return;

    const POLL_INTERVAL = 3000;
    const interval = setInterval(async () => {
      // Skip polling if WS just reconnected
      if (isSocketConnected()) return;

      try {
        const [freshMessages, room] = await Promise.all([
          fetchMessages(workspaceId, roomId, token),
          fetchRoom(workspaceId, roomId, token),
        ]);

        for (const m of freshMessages) addMessage(m);
        if (room.status !== roomStatus) setRoomStatus(room.status);
      } catch {
        // Silently ignore poll failures (e.g. 401 expired token)
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isConnected, roomId, workspaceId, token, addMessage, roomStatus]);
  return {
    messages,
    roomStatus,
    activeTurn,
    lastError,
    isConnected,
  };
}
