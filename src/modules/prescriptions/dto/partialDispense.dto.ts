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

class PartialDispenseItemDto {
  @ApiProperty({ description: 'Prescription item UUID' })
  @IsUUID()
  prescriptionItemId: string;

  @ApiProperty({ example: 10, description: 'Quantity to dispense' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Substituted drug UUID if swap occurred' })
  @IsOptional()
  @IsUUID()
  substitutedDrugId?: string;
}

export class PartialDispenseDto {
  @ApiProperty({ type: [PartialDispenseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartialDispenseItemDto)
  items: PartialDispenseItemDto[];

  @ApiPropertyOptional({ description: 'Dispense notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
