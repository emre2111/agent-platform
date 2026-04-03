import { IsString, MinLength, Matches } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug: string;
}
