import { IsString, IsOptional, IsBoolean, IsObject, MinLength } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  systemPrompt: string;

  @IsString()
  modelProvider: string;

  @IsString()
  modelName: string;

  @IsObject()
  @IsOptional()
  modelConfig?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
