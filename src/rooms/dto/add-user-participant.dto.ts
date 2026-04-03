import { IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class AddUserParticipantDto {
  @IsUUID()
  userId: string;

  @IsBoolean()
  @IsOptional()
  canIntervene?: boolean;
}
