import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const existing = await this.db.workspace.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already taken');

    return this.db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.name, slug: dto.slug },
      });
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });
      return workspace;
    });
  }

  async findById(id: string) {
    const ws = await this.db.workspace.findUnique({ where: { id } });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async listForUser(userId: string) {
    return this.db.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    return this.db.workspaceMember.create({
      data: { workspaceId, userId, role },
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    return this.db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  async listMembers(workspaceId: string) {
    return this.db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });
  }
}
