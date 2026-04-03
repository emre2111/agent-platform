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
 * Verifies the current user may mutate the targeted room.
 *
 * Must run AFTER: JwtAuthGuard → WorkspaceMemberGuard
 */
@Injectable()
export class RoomOwnerGuard implements CanActivate {
  constructor(private readonly permissions: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    const workspaceId: string | undefined = request.workspace?.workspaceId;
    const roomId: string | undefined =
      request.params.roomId ?? request.params.id;

    if (!userId || !workspaceId || !roomId) {
      throw new ForbiddenException('Missing required context');
    }

    const room = await this.permissions.getRoomInWorkspace(
      roomId,
      workspaceId,
    );
    if (!room) {
      throw new NotFoundException('Room not found in this workspace');
    }

    const allowed = this.permissions.evaluate({
      user: request.user,
      workspace: request.workspace,
      action: Action.UPDATE,
      resource: Resource.ROOM,
      resourceId: room.id,
      resourceOwnerId: room.createdById,
    });

    if (!allowed) {
      throw new ForbiddenException(
        'Must be room creator or workspace admin',
      );
    }

    return true;
  }
}
