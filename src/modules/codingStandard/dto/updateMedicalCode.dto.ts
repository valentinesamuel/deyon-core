import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateMedicalCodeDto {
  @IsOptional()
  @IsUUID()
  standardId?: string;

  @IsOptional()
  @IsString()
  codeValue?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
