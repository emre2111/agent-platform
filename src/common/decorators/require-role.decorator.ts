import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

export const ROLES_KEY = 'requiredRole';

export const RequireRole = (role: WorkspaceRole) =>
  SetMetadata(ROLES_KEY, role);
