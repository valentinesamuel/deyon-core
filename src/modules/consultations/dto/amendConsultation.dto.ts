import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SelectedDiagnosisDto {
  @IsString() code: string;
  @IsString() description: string;
  isPrimary: boolean;
}

export class AmendConsultationDto {
  @ApiProperty({ description: 'Reason for amendment' })
  @IsString()
  amendmentReason: string;

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
