import { IsString, IsOptional, IsEnum, IsInt, Min, MinLength } from 'class-validator';
import { TurnPolicy } from '@prisma/client';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TurnPolicy)
  @IsOptional()
  turnPolicy?: TurnPolicy;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxTurns?: number;
}
