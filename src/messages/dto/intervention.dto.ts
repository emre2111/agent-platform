import { IsString, IsInt, Min, MinLength } from 'class-validator';

export class InterventionDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsInt()
  @Min(0)
  turnNumber: number;
}
