import { Injectable, BadRequestException } from '@nestjs/common';
import { ParticipantType } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: PermissionsService,
  ) {}

  async addAgent(roomId: string, agentId: string, addedByUserId: string, workspaceId: string) {
    const canJoin = await this.permissions.canJoinRoom(addedByUserId, agentId, workspaceId);
    if (!canJoin) throw new BadRequestException('Not allowed to add this agent');

    const maxSeat = await this.db.conversationParticipant.aggregate({
      where: { roomId },
      _max: { seatOrder: true },
    });

    return this.db.conversationParticipant.create({
      data: {
        roomId,
        participantType: ParticipantType.AGENT,
        agentId,
        seatOrder: (maxSeat._max.seatOrder ?? -1) + 1,
      },
    });
  }

  async addUser(roomId: string, userId: string, canIntervene: boolean) {
    const maxSeat = await this.db.conversationParticipant.aggregate({
      where: { roomId },
      _max: { seatOrder: true },
    });

    return this.db.conversationParticipant.create({
      data: {
        roomId,
        participantType: ParticipantType.USER,
        userId,
        canIntervene,
        seatOrder: (maxSeat._max.seatOrder ?? -1) + 1,
      },
    });
  }

  async remove(roomId: string, participantId: string) {
    return this.db.conversationParticipant.update({
      where: { id: participantId, roomId },
      data: { leftAt: new Date() },
    });
  }

  async listAgents(roomId: string) {
    return this.db.conversationParticipant.findMany({
      where: { roomId, participantType: ParticipantType.AGENT, leftAt: null },
      include: { agent: true },
      orderBy: { seatOrder: 'asc' },
    });
  }
}
