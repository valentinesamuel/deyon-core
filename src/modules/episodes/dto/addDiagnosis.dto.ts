import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class AddDiagnosisDto {
  @ApiProperty({ description: 'MedicalCode UUID (ICD-10)' })
  @IsUUID()
  medicalCodeId: string;

  @ApiProperty({ example: 'primary', description: 'primary | secondary | differential' })
  @IsString()
  diagnosisType: string;
}
