import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddPatientHistoryDto {
  @ApiProperty({ description: 'MedicalCatalog UUID (allergy / condition / surgery)' })
  @IsUUID()
  catalogId: string;

  @ApiPropertyOptional({ example: 'Penicillin allergy' })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiProperty({ example: 'mild' })
  @IsString()
  severity: string;
}
