import { IsString } from 'class-validator';

export class CreateMedicalCodeDto {
  @IsString()
  codeValue: string;

  @IsString()
  description: string;
}
