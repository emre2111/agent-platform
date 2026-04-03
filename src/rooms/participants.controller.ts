import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { AddAgentParticipantDto } from './dto/add-agent-participant.dto';
import { AddUserParticipantDto } from './dto/add-user-participant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser } from '../common/decorators';
import { RequestUser } from '../common/types';

@Controller('workspaces/:workspaceId/rooms/:roomId/participants')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  list(@Param('roomId') roomId: string) {
    return this.participantsService.listAgents(roomId);
  }

  @Post('agents')
  addAgent(
    @Param('workspaceId') workspaceId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AddAgentParticipantDto,
  ) {
    return this.participantsService.addAgent(roomId, dto.agentId, user.userId, workspaceId);
  }

  @Post('users')
  addUser(
    @Param('roomId') roomId: string,
    @Body() dto: AddUserParticipantDto,
  ) {
    return this.participantsService.addUser(roomId, dto.userId, dto.canIntervene ?? false);
  }

  @Delete(':participantId')
  remove(
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.participantsService.remove(roomId, participantId);
  }
}
