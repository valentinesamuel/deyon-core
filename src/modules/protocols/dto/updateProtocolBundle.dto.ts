import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProtocolBundleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  medicalCodeId?: string;
}
