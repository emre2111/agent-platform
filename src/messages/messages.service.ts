import { Injectable } from '@nestjs/common';
import { Prisma, SenderType } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { RealtimePublisher } from '../realtime/realtime.publisher';

export interface CreateMessageParams {
  roomId: string;
  senderType: SenderType;
  senderUserId?: string;
  senderAgentId?: string;
  turnNumber: number;
  content: string;
  tokenCount?: number;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly publisher: RealtimePublisher,
  ) {}

  /**
   * Persist a message and publish it to all room subscribers.
   * This is the ONLY codepath that creates messages — both
   * the orchestrator and the intervention endpoint call this.
   */
  async create(params: CreateMessageParams) {
    const message = await this.db.message.create({ data: params });

    await this.publisher.publishMessage({
      id: message.id,
      roomId: message.roomId,
      senderType: message.senderType,
      senderUserId: message.senderUserId,
      senderAgentId: message.senderAgentId,
      turnNumber: message.turnNumber,
      content: message.content,
      tokenCount: message.tokenCount,
      createdAt: message.createdAt,
    });

    return message;
  }

  async listByRoom(roomId: string, cursor?: string, limit = 50) {
    return this.db.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {}),
      include: {
        senderUser: { select: { id: true, name: true, avatarUrl: true } },
        senderAgent: { select: { id: true, name: true } },
      },
    });
  }

  async getConversationContext(roomId: string, lastN: number) {
    return this.db.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: lastN,
      select: { senderType: true, senderAgentId: true, content: true, turnNumber: true },
    }).then((msgs) => msgs.reverse());
  }
}
