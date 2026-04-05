'use client';

import { useRoomSubscription } from '@/lib/realtime/use-room-subscription';
import { sendIntervention } from '@/lib/api/rooms';
import { RoomHeader } from './room-header';
import { RoomControls } from './room-controls';
import { ParticipantList } from './participant-list';
import { MessageList } from './message-list';
import { TurnIndicator } from './turn-indicator';
import { InterventionInput } from './intervention-input';
import { ConnectionStatus } from './connection-status';
import type { Room, Message, RoomStatus } from '@/lib/types/room';

interface RoomLiveViewProps {
  room: Room;
  initialMessages: Message[];
  workspaceId: string;
  token: string;
  hasPendingInvites?: boolean;
}

export function RoomLiveView({
  room,
  initialMessages,
  workspaceId,
  token,
  hasPendingInvites = false,
}: RoomLiveViewProps) {
  const {
    messages,
    roomStatus,
    activeTurn,
    lastError,
    isConnected,
  } = useRoomSubscription({
    roomId: room.id,
    workspaceId,
    token,
    initialMessages,
    initialStatus: room.status,
  });

  const canIntervene =
    roomStatus === 'RUNNING' || roomStatus === 'PAUSED';

  async function handleSendMessage(content: string) {
    const turnNumber = messages.length > 0
      ? messages[messages.length - 1].turnNumber + 1
      : 1;
    await sendIntervention(workspaceId, room.id, token, content, turnNumber);
  }

  function handleStatusChange(newStatus: RoomStatus) {
    void newStatus;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <RoomHeader room={room} currentStatus={roomStatus} />
          <RoomControls
            workspaceId={workspaceId}
            roomId={room.id}
            status={roomStatus}
            token={token}
            hasPendingInvites={hasPendingInvites}
            onStatusChange={handleStatusChange}
          />
        </div>

        <ConnectionStatus connected={isConnected} />
        <MessageList messages={messages} />
        <TurnIndicator activeTurn={activeTurn} lastError={lastError} />
        <InterventionInput
          disabled={!canIntervene}
          onSend={handleSendMessage}
        />
      </div>

      <div className="w-64 shrink-0 border-l border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">
          Participants
        </h2>
        <ParticipantList participants={room.participants} />
      </div>
    </div>
  );
}
