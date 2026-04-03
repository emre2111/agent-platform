import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AgentStatus, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Action, Resource, WorkspaceContext } from '../common/types';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(workspaceId: string, ownerId: string, dto: CreateAgentDto) {
    return this.db.agent.create({
      data: {
        workspaceId,
        ownerId,
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        modelProvider: dto.modelProvider,
        modelName: dto.modelName,
        modelConfig: (dto.modelConfig ?? {}) as Prisma.InputJsonValue,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  /**
   * Every read operation scopes by BOTH id AND workspaceId.
   * Even if an attacker guesses a valid agent UUID, they cannot
   * access it unless it belongs to their verified workspace.
   */
  async findById(agentId: string, workspace: WorkspaceContext, userId: string) {
    const agent = await this.db.agent.findFirst({
      where: { id: agentId, workspaceId: workspace.workspaceId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    this.permissions.enforce({
      user: { userId, email: '' },
      workspace,
      action: Action.READ,
      resource: Resource.AGENT,
      resourceId: agent.id,
      resourceOwnerId: agent.ownerId,
      resourceIsPublic: agent.isPublic,
    });

    return agent;
  }

  async listByWorkspace(workspaceId: string, userId: string, isAdmin: boolean) {
    return this.db.agent.findMany({
      where: {
        workspaceId,
        status: { not: AgentStatus.ARCHIVED },
        // Admins see all agents; members see own + public
        ...(!isAdmin && {
          OR: [{ ownerId: userId }, { isPublic: true }],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    agentId: string,
    workspace: WorkspaceContext,
    userId: string,
    dto: UpdateAgentDto,
  ) {
    const agent = await this.db.agent.findFirst({
      where: { id: agentId, workspaceId: workspace.workspaceId },
      select: { id: true, ownerId: true, isPublic: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    this.permissions.enforce({
      user: { userId, email: '' },
      workspace,
      action: Action.UPDATE,
      resource: Resource.AGENT,
      resourceId: agent.id,
      resourceOwnerId: agent.ownerId,
      resourceIsPublic: agent.isPublic,
    });

    const {
      name,
      description,
      systemPrompt,
      modelProvider,
      modelName,
      modelConfig,
      isPublic,
    } = dto;

    return this.db.agent.update({
      where: { id: agentId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(modelProvider !== undefined && { modelProvider }),
        ...(modelName !== undefined && { modelName }),
        ...(modelConfig !== undefined && {
          modelConfig: modelConfig as Prisma.InputJsonValue,
        }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });
  }

  async archive(agentId: string, workspace: WorkspaceContext, userId: string) {
    const agent = await this.db.agent.findFirst({
      where: { id: agentId, workspaceId: workspace.workspaceId },
      select: { id: true, ownerId: true, isPublic: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    this.permissions.enforce({
      user: { userId, email: '' },
      workspace,
      action: Action.DELETE,
      resource: Resource.AGENT,
      resourceId: agent.id,
      resourceOwnerId: agent.ownerId,
      resourceIsPublic: agent.isPublic,
    });

    return this.db.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.ARCHIVED },
    });
  }

  async activate(agentId: string, workspace: WorkspaceContext, userId: string) {
    const agent = await this.db.agent.findFirst({
      where: { id: agentId, workspaceId: workspace.workspaceId },
      select: { id: true, ownerId: true, isPublic: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    this.permissions.enforce({
      user: { userId, email: '' },
      workspace,
      action: Action.UPDATE,
      resource: Resource.AGENT,
      resourceId: agent.id,
      resourceOwnerId: agent.ownerId,
      resourceIsPublic: agent.isPublic,
    });

    return this.db.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.ACTIVE },
    });
  }
}
