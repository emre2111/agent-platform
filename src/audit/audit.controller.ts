import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';

@Controller('workspaces/:workspaceId/audit-logs')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Param('workspaceId') workspaceId: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.query(workspaceId, {
      actorId,
      action,
      targetType,
      cursor,
      limit,
    });
  }
}
