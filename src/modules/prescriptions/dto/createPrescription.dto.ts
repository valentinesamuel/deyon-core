import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PrescriptionItemDto {
  @ApiProperty({ description: 'Inventory (drug) UUID' })
  @IsUUID()
  drugId: string;

  @ApiProperty({ example: 500, description: 'Dosage value' })
  @IsNumber()
  @Min(0)
  dosageValue: number;

  @ApiProperty({ example: 'mg', description: 'Dosage unit' })
  @IsString()
  dosageUnit: string;

  @ApiProperty({ example: 3, description: 'Frequency value' })
  @IsNumber()
  @Min(0)
  frequencyValue: number;

  @ApiProperty({ example: 'times/day', description: 'Frequency unit' })
  @IsString()
  frequencyUnit: string;

  @ApiProperty({ example: 7, description: 'Duration value' })
  @IsNumber()
  @Min(1)
  durationValue: number;

  @ApiProperty({ example: 'days', description: 'Duration unit' })
  @IsString()
  durationUnit: string;

  @ApiProperty({ example: 21, description: 'Total quantity prescribed' })
  @IsNumber()
  @Min(1)
  prescribedQuantity: number;
}

export class CreatePrescriptionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Doctor (staff) UUID' })
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PrescriptionItemDto], description: 'Prescription items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
