import { IsEnum, Matches } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AddMemberDto {
  @Matches(UUID_REGEX, { message: 'userId must be a valid UUID' })
  userId: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
