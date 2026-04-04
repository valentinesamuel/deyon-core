import { IsOptional, IsString } from 'class-validator';

export class UpdateCodingStandardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
