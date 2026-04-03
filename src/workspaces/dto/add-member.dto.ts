import { IsEnum, IsUUID } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
