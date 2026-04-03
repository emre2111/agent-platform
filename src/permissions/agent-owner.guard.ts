import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Action, Resource } from '../common/types';

/**
 * Verifies that the current user may mutate the targeted agent.
 *
 * Loads the agent scoped to the verified workspace (preventing
 * cross-tenant access), then evaluates the policy.
 *
 * Must run AFTER: JwtAuthGuard → WorkspaceMemberGuard
 */
@Injectable()
export class AgentOwnerGuard implements CanActivate {
  constructor(private readonly permissions: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    const workspaceId: string | undefined = request.workspace?.workspaceId;
    const agentId: string | undefined =
      request.params.agentId ?? request.params.id;

    if (!userId || !workspaceId || !agentId) {
      throw new ForbiddenException('Missing required context');
    }

    const agent = await this.permissions.getAgentInWorkspace(
      agentId,
      workspaceId,
    );
    if (!agent) {
      throw new NotFoundException('Agent not found in this workspace');
    }

    const allowed = this.permissions.evaluate({
      user: request.user,
      workspace: request.workspace,
      action: Action.UPDATE,
      resource: Resource.AGENT,
      resourceId: agent.id,
      resourceOwnerId: agent.ownerId,
      resourceIsPublic: agent.isPublic,
    });

    if (!allowed) {
      throw new ForbiddenException(
        'Must be agent owner or workspace admin',
      );
    }

    return true;
  }
}
