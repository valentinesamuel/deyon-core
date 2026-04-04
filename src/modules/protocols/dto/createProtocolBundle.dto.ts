import { IsString, IsUUID } from 'class-validator';

export class CreateProtocolBundleDto {
  @IsString()
  name: string;

  @IsUUID()
  medicalCodeId: string;
}
