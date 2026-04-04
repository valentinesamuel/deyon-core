import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SelectedDiagnosisDto {
  @ApiPropertyOptional({ example: 'J45', description: 'ICD-10 code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Asthma', description: 'Diagnosis description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: true })
  isPrimary: boolean;
}

export class UpdateConsultationDto {
  @ApiPropertyOptional({ description: 'Chief complaint' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: 'History of present illness' })
  @IsOptional()
  @IsString()
  historyOfPresentIllness?: string;

  @ApiPropertyOptional({ description: 'Physical examination findings' })
  @IsOptional()
  @IsString()
  physicalExamination?: string;

  @ApiPropertyOptional({ description: 'Treatment plan' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ type: [SelectedDiagnosisDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedDiagnosisDto)
  selectedDiagnoses?: SelectedDiagnosisDto[];

  @ApiPropertyOptional({ description: 'Follow-up date (ISO8601)' })
  @IsOptional()
  @IsISO8601()
  followUpDate?: string;
}
