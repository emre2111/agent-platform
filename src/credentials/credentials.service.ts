import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CryptoService } from '../crypto/crypto.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-events';
import { Action, Resource, WorkspaceContext } from '../common/types';
import { SetCredentialDto } from './dto/set-credential.dto';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly crypto: CryptoService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  private async verifyAccess(
    agentId: string,
    workspace: WorkspaceContext,
    userId: string,
    action: Action,
  ) {
    const agent = await this.permissions.getAgentInWorkspace(
      agentId,
      workspace.workspaceId,
    );
    if (!agent) {
      throw new NotFoundException('Agent not found in this workspace');
    }

    this.permissions.enforce({
      user: { userId, email: '' },
      workspace,
      action,
      resource: Resource.CREDENTIAL,
      resourceId: agentId,
      resourceOwnerId: agent.ownerId,
      resourceIsPublic: agent.isPublic,
    });

    return agent;
  }

  async set(
    agentId: string,
    dto: SetCredentialDto,
    workspace: WorkspaceContext,
    userId: string,
  ) {
    await this.verifyAccess(agentId, workspace, userId, Action.UPDATE);

    const encryptedKey = this.crypto.encrypt(dto.apiKey);
    const keyFingerprint = this.crypto.fingerprint(dto.apiKey);

    const result = await this.db.agentCredential.upsert({
      where: { agentId_provider: { agentId, provider: dto.provider } },
      create: { agentId, provider: dto.provider, encryptedKey, keyFingerprint },
      update: { encryptedKey, keyFingerprint },
    });

    await this.audit.log({
      workspaceId: workspace.workspaceId,
      actorId: userId,
      action: AuditAction.CREDENTIAL_SET,
      targetId: result.id,
      metadata: {
        agentId,
        provider: dto.provider,
        keyFingerprint,
      },
    });

    return result;
  }

  async list(
    agentId: string,
    workspace: WorkspaceContext,
    userId: string,
  ) {
    await this.verifyAccess(agentId, workspace, userId, Action.READ);

    return this.db.agentCredential.findMany({
      where: { agentId },
      select: {
        id: true,
        provider: true,
        keyFingerprint: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(
    agentId: string,
    provider: string,
    workspace: WorkspaceContext,
    userId: string,
  ) {
    await this.verifyAccess(agentId, workspace, userId, Action.DELETE);

    const result = await this.db.agentCredential.delete({
      where: { agentId_provider: { agentId, provider } },
    });

    await this.audit.log({
      workspaceId: workspace.workspaceId,
      actorId: userId,
      action: AuditAction.CREDENTIAL_DELETED,
      targetId: result.id,
      metadata: { agentId, provider },
    });

    return result;
  }

  async decryptKey(
    agentId: string,
    provider: string,
    workspaceId: string,
  ): Promise<string> {
    const agent = await this.db.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { id: true },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found in workspace');
    }

    const cred = await this.db.agentCredential.findUnique({
      where: { agentId_provider: { agentId, provider } },
    });
    if (!cred) {
      throw new NotFoundException(
        `No ${provider} credential for agent ${agentId}`,
      );
    }

    // Audit credential access — actor is "system" for background jobs
    await this.audit.log({
      workspaceId,
      actorId: null,
      action: AuditAction.CREDENTIAL_ACCESSED,
      targetId: cred.id,
      metadata: { agentId, provider, source: 'orchestrator' },
    });

    return this.crypto.decrypt(cred.encryptedKey);
  }
}
