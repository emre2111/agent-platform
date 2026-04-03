import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { WorkspaceContext } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates workspace membership and populates request.workspace.
 *
 * SECURITY: The workspace ID is ONLY read from the URL path parameter
 * `:workspaceId`. We never trust client-controlled headers or body
 * fields for tenant identification because they bypass URL-based
 * routing and can trivially be spoofed to access other tenants.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    const workspaceId: string | undefined = request.params.workspaceId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!workspaceId) {
      throw new BadRequestException(
        'Route must include :workspaceId path parameter',
      );
    }

    if (!UUID_RE.test(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID format');
    }

    const member = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const wsCtx: WorkspaceContext = {
      workspaceId,
      role: member.role,
      isAdmin: member.role === 'ADMIN' || member.role === 'OWNER',
      isOwner: member.role === 'OWNER',
    };

    request.workspace = wsCtx;
    return true;
  }
}
