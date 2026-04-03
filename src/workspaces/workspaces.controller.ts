import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import { RequestUser } from '../common/types';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: RequestUser) {
    return this.workspacesService.create(dto, user.userId);
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.workspacesService.listForUser(user.userId);
  }

  @Get(':workspaceId')
  findOne(@Param('workspaceId') id: string) {
    return this.workspacesService.findById(id);
  }
}
