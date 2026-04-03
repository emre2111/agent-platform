import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { ROLES_KEY } from '../common/decorators';
import { PermissionsService } from './permissions.service';

/**
 * Enforces @RequireRole(WorkspaceRole.ADMIN) on a route.
 * Must run AFTER WorkspaceMemberGuard (which populates request.workspace).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<WorkspaceRole>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest();
    const actualRole = request.workspace?.role;

    if (!actualRole) {
      throw new ForbiddenException('Workspace context missing');
    }

    if (!this.permissions.meetsRole(actualRole, requiredRole)) {
      throw new ForbiddenException(
        `Requires ${requiredRole} role or higher`,
      );
    }

    return true;
  }
}
