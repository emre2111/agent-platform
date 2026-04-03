import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser, WorkspaceId } from '../common/decorators';
import { RequestUser } from '../common/types';

@Controller('workspaces/:workspaceId/rooms/:roomId/invites')
@UseGuards(WorkspaceMemberGuard)
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  send(
    @Param('roomId') roomId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { email: string },
  ) {
    return this.invites.sendInvite(roomId, workspaceId, user.userId, body.email);
  }

  @Get()
  list(
    @Param('roomId') roomId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.invites.listByRoom(roomId, workspaceId);
  }

  @Post(':inviteId/accept')
  accept(
    @Param('inviteId') inviteId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { agentId: string },
  ) {
    return this.invites.acceptInvite(inviteId, user.userId, body.agentId, workspaceId);
  }

  @Post(':inviteId/decline')
  decline(
    @Param('inviteId') inviteId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.invites.declineInvite(inviteId, user.userId, workspaceId);
  }
}

@Controller('workspaces/:workspaceId/my/invites')
@UseGuards(WorkspaceMemberGuard)
export class MyInvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.invites.listMyPendingInvites(user.userId, workspaceId);
  }

  @Get('count')
  count(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.invites.countMyPendingInvites(user.userId, workspaceId).then((count) => ({ count }));
  }
}
