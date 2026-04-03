import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser, WorkspaceId } from '../common/decorators';
import { RequestUser, AuthenticatedRequest } from '../common/types';

@Controller('workspaces/:workspaceId/agents')
@UseGuards(WorkspaceMemberGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAgentDto,
  ) {
    return this.agentsService.create(workspaceId, user.userId, dto);
  }

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.agentsService.listByWorkspace(
      workspaceId,
      user.userId,
      req.workspace!.isAdmin,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.agentsService.findById(id, req.workspace!, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, req.workspace!, user.userId, dto);
  }

  @Delete(':id')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.agentsService.archive(id, req.workspace!, user.userId);
  }

  @Post(':id/activate')
  activate(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.agentsService.activate(id, req.workspace!, user.userId);
  }
}
