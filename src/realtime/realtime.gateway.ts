import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  SubscribeRoomPayload,
  UnsubscribeRoomPayload,
  MessagePayload,
  TurnStartedPayload,
  TurnErrorPayload,
  RoomStatusPayload,
} from './events';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: TypedServer;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Authenticate on handshake. The JWT is passed as a query param:
   *   io("ws://host/ws", { query: { token: "eyJ..." } })
   *
   * If invalid, the socket is disconnected immediately.
   */
  async handleConnection(client: TypedSocket) {
    try {
      const token =
        (client.handshake.query.token as string) ??
        client.handshake.auth?.token;

      if (!token) {
        throw new Error('Missing authentication token');
      }

      const payload = this.jwt.verify<{ sub: string; email: string }>(token);

      client.data.userId = payload.sub;
      client.data.email = payload.email;

      this.logger.debug(`Authenticated socket ${client.id} as user ${payload.sub}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      this.logger.warn(`Socket ${client.id} auth failed: ${message}`);
      client.emit('error', { code: 'AUTH_FAILED', message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: TypedSocket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  /**
   * Subscribe to a room's live events.
   *
   * Permission check: the user must be a workspace member
   * AND the room must belong to that workspace.
   *
   * Uses an acknowledgement callback so the client knows
   * whether the subscription succeeded or failed.
   */
  @SubscribeMessage('subscribe_room')
  async handleSubscribe(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: SubscribeRoomPayload,
  ): Promise<{ ok: boolean; error?: string }> {
    const userId = client.data.userId;
    if (!userId) {
      return { ok: false, error: 'Not authenticated' };
    }

    if (!data.roomId || !UUID_RE.test(data.roomId)) {
      return { ok: false, error: 'Invalid room ID' };
    }

    if (!data.workspaceId || !UUID_RE.test(data.workspaceId)) {
      return { ok: false, error: 'Invalid workspace ID' };
    }

    const [membership, room] = await Promise.all([
      this.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: data.workspaceId,
            userId,
          },
        },
        select: { role: true },
      }),
      this.db.conversationRoom.findFirst({
        where: { id: data.roomId, workspaceId: data.workspaceId },
        select: { id: true },
      }),
    ]);

    if (!membership) {
      return { ok: false, error: 'Not a workspace member' };
    }

    if (!room) {
      return { ok: false, error: 'Room not found in this workspace' };
    }

    client.join(`room:${data.roomId}`);

    this.logger.debug(
      `User ${userId} subscribed to room ${data.roomId}`,
    );

    return { ok: true };
  }

  @SubscribeMessage('unsubscribe_room')
  handleUnsubscribe(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: UnsubscribeRoomPayload,
  ) {
    client.leave(`room:${data.roomId}`);
  }

  // ─── Server-side emit helpers (called by RealtimePublisher) ──

  emitMessage(roomId: string, payload: MessagePayload): void {
    this.server.to(`room:${roomId}`).emit('message.new', payload);
  }

  emitTurnStarted(roomId: string, payload: TurnStartedPayload): void {
    this.server.to(`room:${roomId}`).emit('turn.started', payload);
  }

  emitTurnError(roomId: string, payload: TurnErrorPayload): void {
    this.server.to(`room:${roomId}`).emit('turn.error', payload);
  }

  emitRoomStatus(roomId: string, payload: RoomStatusPayload): void {
    this.server.to(`room:${roomId}`).emit('room.status', payload);
  }
}
