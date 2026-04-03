import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { SetCredentialDto } from './dto/set-credential.dto';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser } from '../common/decorators';
import { RequestUser, AuthenticatedRequest } from '../common/types';

@Controller('workspaces/:workspaceId/agents/:agentId/credentials')
@UseGuards(WorkspaceMemberGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  list(
    @Param('agentId') agentId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.credentialsService.list(agentId, req.workspace!, user.userId);
  }

  @Put()
  set(
    @Param('agentId') agentId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetCredentialDto,
  ) {
    return this.credentialsService.set(agentId, dto, req.workspace!, user.userId);
  }

  @Delete(':provider')
  remove(
    @Param('agentId') agentId: string,
    @Param('provider') provider: string,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.credentialsService.delete(agentId, provider, req.workspace!, user.userId);
  }
}
