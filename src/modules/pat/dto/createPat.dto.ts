import { IsString, IsOptional, IsISO8601, MinLength, MaxLength } from 'class-validator';

export class CreatePatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
