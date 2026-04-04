import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DispensePrescriptionDto {
  @ApiPropertyOptional({ description: 'Dispense notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
