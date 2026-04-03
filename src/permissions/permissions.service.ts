import { Injectable, ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import {
  Action,
  Resource,
  PolicyContext,
  WorkspaceContext,
} from '../common/types';
import { ACCESS_POLICIES, ROLE_WEIGHT, PolicyKey } from './policies';

@Injectable()
export class PermissionsService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Core policy evaluation ────────────────────────────────

  /**
   * Pure, synchronous policy check. Returns true/false.
   * Does NOT hit the database — ownership fields must be
   * pre-fetched and passed in via PolicyContext.
   */
  evaluate(ctx: PolicyContext): boolean {
    const key = `${ctx.resource}:${ctx.action}` as PolicyKey;
    const rule = ACCESS_POLICIES[key];

    // Default deny: if no rule exists, access is forbidden
    if (rule === undefined) return false;

    // Role check: does the user's role meet the minimum?
    if (!this.meetsRole(ctx.workspace.role, rule.role)) {
      // Admins+ override ownership restrictions
      if (!ctx.workspace.isAdmin) return false;
    }

    // Ownership check
    switch (rule.ownership) {
      case 'any':
        return true;

      case 'own':
        // Owner of the resource, OR workspace admin+
        if (ctx.workspace.isAdmin) return true;
        return ctx.resourceOwnerId === ctx.user.userId;

      case 'public':
        // Public resource, OR owner, OR workspace admin+
        if (ctx.workspace.isAdmin) return true;
        if (ctx.resourceIsPublic) return true;
        return ctx.resourceOwnerId === ctx.user.userId;

      default:
        return false;
    }
  }

  /**
   * Same as evaluate(), but throws ForbiddenException on denial.
   * Convenience for imperative checks inside service methods.
   */
  enforce(ctx: PolicyContext): void {
    if (!this.evaluate(ctx)) {
      throw new ForbiddenException(
        `Access denied: ${ctx.action} on ${ctx.resource}`,
      );
    }
  }

  // ─── Role helpers ──────────────────────────────────────────

  meetsRole(actual: WorkspaceRole, required: WorkspaceRole): boolean {
    return ROLE_WEIGHT[actual] >= ROLE_WEIGHT[required];
  }

  // ─── Workspace-scoped resource fetchers ────────────────────
  //
  // These exist so guards can load a resource AND verify it
  // belongs to the current workspace in a single query, preventing
  // cross-tenant access via ID guessing.
  //

  async getAgentInWorkspace(agentId: string, workspaceId: string) {
    return this.db.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: {
        id: true,
        ownerId: true,
        isPublic: true,
        workspaceId: true,
        status: true,
      },
    });
  }

  async getRoomInWorkspace(roomId: string, workspaceId: string) {
    return this.db.conversationRoom.findFirst({
      where: { id: roomId, workspaceId },
      select: {
        id: true,
        createdById: true,
        workspaceId: true,
        status: true,
      },
    });
  }

  async getApiKeyInWorkspace(apiKeyId: string, workspaceId: string) {
    return this.db.apiKey.findFirst({
      where: { id: apiKeyId, workspaceId },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
      },
    });
  }

  async canJoinRoom(
    userId: string,
    agentId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const agent = await this.db.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { ownerId: true, isPublic: true },
    });
    if (!agent) return false;
    return agent.isPublic || agent.ownerId === userId;
  }

  // ─── Compound permission checks ────────────────────────────
  //
  // For use in service-layer imperative checks where a guard
  // cannot easily cover the case.
  //

  async canAccessAgent(
    userId: string,
    agentId: string,
    workspace: WorkspaceContext,
    action: Action,
  ): Promise<boolean> {
    const agent = await this.getAgentInWorkspace(agentId, workspace.workspaceId);
    if (!agent) return false;

    return this.evaluate({
      user: { userId, email: '' },
      workspace,
      action,
      resource: Resource.AGENT,
      resourceId: agent.id,
      resourceOwnerId: agent.ownerId,
      resourceIsPublic: agent.isPublic,
    });
  }

  async canAccessRoom(
    userId: string,
    roomId: string,
    workspace: WorkspaceContext,
    action: Action,
  ): Promise<boolean> {
    const room = await this.getRoomInWorkspace(roomId, workspace.workspaceId);
    if (!room) return false;

    return this.evaluate({
      user: { userId, email: '' },
      workspace,
      action,
      resource: Resource.ROOM,
      resourceId: room.id,
      resourceOwnerId: room.createdById,
    });
  }
}
