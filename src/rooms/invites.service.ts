import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InviteStatus, ParticipantType } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InvitesService {
  constructor(private readonly db: DatabaseService) {}

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
      include: { room: { select: { id: true, workspaceId: true } } },
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

    return this.db.$transaction(async (tx) => {
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

    return this.db.roomInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.DECLINED, respondedAt: new Date() },
    });
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
