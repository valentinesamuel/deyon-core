import { IsString, IsUUID } from 'class-validator';

export class CreateMedicalCodeDto {
  @IsUUID()
  standardId: string;

  @IsString()
  codeValue: string;

  @IsString()
  description: string;
}
