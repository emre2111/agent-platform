import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-events';
import { CreateRoomDto } from './dto/create-room.dto';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser, WorkspaceId } from '../common/decorators';
import { RequestUser, AuthenticatedRequest } from '../common/types';

@Controller('workspaces/:workspaceId/rooms')
@UseGuards(WorkspaceMemberGuard)
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly orchestrator: OrchestratorService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRoomDto,
  ) {
    const room = await this.roomsService.create(workspaceId, user.userId, dto);

    await this.audit.log({
      workspaceId,
      actorId: user.userId,
      action: AuditAction.ROOM_CREATED,
      targetId: room.id,
      metadata: { name: dto.name, turnPolicy: dto.turnPolicy },
    });

    return room;
  }

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.roomsService.listByWorkspace(workspaceId);
  }

  @Get(':roomId')
  findOne(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.roomsService.findById(roomId, req.workspace!);
  }

  @Post(':roomId/start')
  async start(
    @Param('roomId') roomId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomsService.updateStatus(
      roomId, RoomStatus.RUNNING, req.workspace!, user.userId,
    );
    await this.orchestrator.startRoom(roomId, workspaceId);

    await this.audit.log({
      workspaceId,
      actorId: user.userId,
      action: AuditAction.ROOM_STARTED,
      targetId: roomId,
    });

    return room;
  }

  @Post(':roomId/resume')
  async resume(
    @Param('roomId') roomId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomsService.updateStatus(
      roomId, RoomStatus.RUNNING, req.workspace!, user.userId,
    );
    await this.orchestrator.resumeRoom(roomId, workspaceId, room.turnCount);

    await this.audit.log({
      workspaceId,
      actorId: user.userId,
      action: AuditAction.ROOM_RESUMED,
      targetId: roomId,
      metadata: { resumedAtTurn: room.turnCount },
    });

    return room;
  }

  @Post(':roomId/pause')
  async pause(
    @Param('roomId') roomId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomsService.updateStatus(
      roomId, RoomStatus.PAUSED, req.workspace!, user.userId,
    );
    await this.orchestrator.drainRoom(roomId);

    await this.audit.log({
      workspaceId,
      actorId: user.userId,
      action: AuditAction.ROOM_PAUSED,
      targetId: roomId,
    });

    return room;
  }

  @Post(':roomId/stop')
  async stop(
    @Param('roomId') roomId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    const room = await this.roomsService.updateStatus(
      roomId, RoomStatus.CLOSED, req.workspace!, user.userId,
    );
    await this.orchestrator.drainRoom(roomId);
    await this.orchestrator.cleanupRoom(roomId);

    await this.audit.log({
      workspaceId,
      actorId: user.userId,
      action: AuditAction.ROOM_STOPPED,
      targetId: roomId,
    });

    return room;
  }
}
