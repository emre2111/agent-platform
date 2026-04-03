import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('workspaces/:workspaceId/members')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class MembersController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.listMembers(workspaceId);
  }

  @Post()
  add(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspacesService.addMember(workspaceId, dto.userId, dto.role);
  }

  @Delete(':userId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspacesService.removeMember(workspaceId, userId);
  }
}
