import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoomStatus, TurnPolicy } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Action, Resource, WorkspaceContext } from '../common/types';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateRoomDto) {
    return this.db.conversationRoom.create({
      data: {
        workspaceId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        turnPolicy: dto.turnPolicy ?? TurnPolicy.ROUND_ROBIN,
        maxTurns: dto.maxTurns,
      },
    });
  }

  /**
   * Always scoped by workspaceId + id. Never a bare findUnique by id alone.
   */
  async findById(roomId: string, workspace: WorkspaceContext) {
    const room = await this.db.conversationRoom.findFirst({
      where: { id: roomId, workspaceId: workspace.workspaceId },
      include: { participants: { include: { agent: true, user: true } } },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async listByWorkspace(workspaceId: string) {
    return this.db.conversationRoom.findMany({
      where: { workspaceId },
      include: { _count: { select: { participants: true, messages: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    roomId: string,
    status: RoomStatus,
    workspace: WorkspaceContext,
    userId: string,
  ) {
    const room = await this.db.conversationRoom.findFirst({
      where: { id: roomId, workspaceId: workspace.workspaceId },
      select: { id: true, status: true, createdById: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const actionMap: Record<string, Action> = {
      RUNNING: Action.START,
      PAUSED: Action.PAUSE,
      CLOSED: Action.STOP,
    };
    const action = actionMap[status] ?? Action.UPDATE;

    this.permissions.enforce({
      user: { userId, email: '' },
      workspace,
      action,
      resource: Resource.ROOM,
      resourceId: room.id,
      resourceOwnerId: room.createdById,
    });

    const validTransitions: Record<RoomStatus, RoomStatus[]> = {
      IDLE: [RoomStatus.RUNNING],
      RUNNING: [RoomStatus.PAUSED, RoomStatus.CLOSED],
      PAUSED: [RoomStatus.RUNNING, RoomStatus.CLOSED],
      CLOSED: [],
    };

    if (!validTransitions[room.status].includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${room.status} to ${status}`,
      );
    }

    return this.db.conversationRoom.update({
      where: { id: roomId },
      data: {
        status,
        ...(status === RoomStatus.CLOSED
          ? { closedAt: new Date(), closedReason: 'manually_stopped' }
          : {}),
      },
    });
  }
}
