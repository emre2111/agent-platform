import { Matches, IsOptional, IsBoolean } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AddUserParticipantDto {
  @Matches(UUID_REGEX, { message: 'userId must be a valid UUID' })
  userId: string;

  @IsBoolean()
  @IsOptional()
  canIntervene?: boolean;
}
