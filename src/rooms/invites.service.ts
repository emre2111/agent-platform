import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InviteStatus, ParticipantType, RoomStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { RealtimePublisher } from '../realtime/realtime.publisher';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly orchestrator: OrchestratorService,
    private readonly publisher: RealtimePublisher,
  ) {}

  async sendInvite(
    roomId: string,
    workspaceId: string,
    inviterId: string,
    email: string,
  ) {
    const room = await this.db.conversationRoom.findFirst({
      where: { id: roomId, workspaceId },
      select: { id: true, createdById: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    if (room.createdById !== inviterId) {
      const membership = await this.db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: inviterId } },
        select: { role: true },
      });
      if (!membership || membership.role === 'MEMBER') {
        throw new ForbiddenException('Only the room creator or workspace admin can send invites');
      }
    }

    const invitee = await this.db.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!invitee) {
      throw new BadRequestException('No user found with that email address');
    }

    if (invitee.id === inviterId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    const inviteeMembership = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
    });
    if (!inviteeMembership) {
      throw new BadRequestException('User is not a member of this workspace');
    }

    const existingParticipant = await this.db.conversationParticipant.findFirst({
      where: { roomId, userId: invitee.id, leftAt: null },
    });
    if (existingParticipant) {
      throw new BadRequestException('User is already a participant in this room');
    }

    const existingInvite = await this.db.roomInvite.findUnique({
      where: { roomId_inviteeId: { roomId, inviteeId: invitee.id } },
    });
    if (existingInvite && existingInvite.status === InviteStatus.PENDING) {
      throw new BadRequestException('User already has a pending invite for this room');
    }

    if (existingInvite) {
      return this.db.roomInvite.update({
        where: { id: existingInvite.id },
        data: {
          status: InviteStatus.PENDING,
          invitedById: inviterId,
          respondedAt: null,
          agentId: null,
        },
        include: {
          invitee: { select: { id: true, name: true, email: true } },
          invitedBy: { select: { id: true, name: true } },
        },
      });
    }

    return this.db.roomInvite.create({
      data: {
        roomId,
        workspaceId,
        invitedById: inviterId,
        inviteeId: invitee.id,
        inviteeEmail: invitee.email,
      },
      include: {
        invitee: { select: { id: true, name: true, email: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });
  }

  async acceptInvite(
    inviteId: string,
    userId: string,
    agentId: string,
    workspaceId: string,
  ) {
    const invite = await this.db.roomInvite.findFirst({
      where: { id: inviteId, workspaceId },
      include: { room: { select: { id: true, workspaceId: true, status: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.inviteeId !== userId) {
      throw new ForbiddenException('This invite is not for you');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Invite is already ${invite.status.toLowerCase()}`);
    }

    const agent = await this.db.agent.findFirst({
      where: {
        id: agentId,
        workspaceId,
        ownerId: userId,
        status: 'ACTIVE',
      },
    });
    if (!agent) {
      throw new BadRequestException('Agent not found, not yours, or not active');
    }

    const room = await this.db.$transaction(async (tx) => {
      await tx.roomInvite.update({
        where: { id: inviteId },
        data: {
          status: InviteStatus.ACCEPTED,
          agentId,
          respondedAt: new Date(),
        },
      });

      const maxSeat = await tx.conversationParticipant.aggregate({
        where: { roomId: invite.roomId },
        _max: { seatOrder: true },
      });
      const nextSeat = (maxSeat._max.seatOrder ?? -1) + 1;

      await tx.conversationParticipant.create({
        data: {
          roomId: invite.roomId,
          participantType: ParticipantType.USER,
          userId,
          canIntervene: true,
          seatOrder: nextSeat,
        },
      });

      await tx.conversationParticipant.create({
        data: {
          roomId: invite.roomId,
          participantType: ParticipantType.AGENT,
          agentId,
          seatOrder: nextSeat + 1,
        },
      });

      return tx.conversationRoom.findUnique({
        where: { id: invite.roomId },
        include: {
          participants: { include: { agent: true, user: true } },
        },
      });
    });

    await this.tryAutoStart(invite.roomId, workspaceId);

    return room;
  }

  async declineInvite(inviteId: string, userId: string, workspaceId: string) {
    const invite = await this.db.roomInvite.findFirst({
      where: { id: inviteId, workspaceId },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.inviteeId !== userId) {
      throw new ForbiddenException('This invite is not for you');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Invite is already ${invite.status.toLowerCase()}`);
    }

    const result = await this.db.roomInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.DECLINED, respondedAt: new Date() },
    });

    await this.tryAutoStart(invite.roomId, workspaceId);

    return result;
  }

  /**
   * Check if all invites are resolved and the room should auto-start.
   *
   * Conditions:
   *   1. Room status is IDLE (not already started manually)
   *   2. Zero PENDING invites remain for this room
   *   3. At least 2 active AGENT participants in the room
   */
  private async tryAutoStart(roomId: string, workspaceId: string): Promise<void> {
    const room = await this.db.conversationRoom.findFirst({
      where: { id: roomId, workspaceId },
      select: { id: true, status: true },
    });
    if (!room || room.status !== RoomStatus.IDLE) return;

    const pendingCount = await this.db.roomInvite.count({
      where: { roomId, status: InviteStatus.PENDING },
    });
    if (pendingCount > 0) return;

    const agentCount = await this.db.conversationParticipant.count({
      where: {
        roomId,
        participantType: ParticipantType.AGENT,
        leftAt: null,
      },
    });
    if (agentCount < 2) return;

    await this.db.conversationRoom.update({
      where: { id: roomId },
      data: { status: RoomStatus.RUNNING },
    });

    await this.orchestrator.startRoom(roomId, workspaceId);

    this.publisher.publishRoomStatus({
      roomId,
      status: 'RUNNING',
      reason: 'All invitees joined — conversation started automatically',
    });

    this.logger.log(
      `Room ${roomId} auto-started: all invites resolved, ${agentCount} agents ready`,
    );
  }

  async listByRoom(roomId: string, workspaceId: string) {
    return this.db.roomInvite.findMany({
      where: { roomId, workspaceId },
      include: {
        invitee: { select: { id: true, name: true, email: true } },
        invitedBy: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMyPendingInvites(userId: string, workspaceId: string) {
    return this.db.roomInvite.findMany({
      where: {
        inviteeId: userId,
        workspaceId,
        status: InviteStatus.PENDING,
      },
      include: {
        room: { select: { id: true, name: true, status: true } },
        invitedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countMyPendingInvites(userId: string, workspaceId: string) {
    return this.db.roomInvite.count({
      where: {
        inviteeId: userId,
        workspaceId,
        status: InviteStatus.PENDING,
      },
    });
  }
}
