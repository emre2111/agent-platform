import { IsString, MinLength } from 'class-validator';

export class SetCredentialDto {
  @IsString()
  provider: string;

  @IsString()
  @MinLength(1)
  apiKey: string;
}
