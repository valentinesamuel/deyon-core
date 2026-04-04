import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsISO8601, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SelectedDiagnosisDto {
  @ApiProperty({ example: 'J45', description: 'ICD-10 code' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Asthma', description: 'Diagnosis description' })
  @IsString()
  description: string;

  @ApiProperty({ example: true, description: 'Whether this is the primary diagnosis' })
  isPrimary: boolean;
}

export class CreateConsultationDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Episode UUID' })
  @IsUUID()
  episodeId: string;

  @ApiPropertyOptional({ description: 'Appointment UUID' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ description: 'Doctor (staff) UUID' })
  @IsUUID()
  doctorId: string;

  @ApiProperty({ description: 'Chief complaint' })
  @IsString()
  chiefComplaint: string;

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

  @ApiPropertyOptional({ type: [SelectedDiagnosisDto], description: 'Selected diagnoses' })
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
