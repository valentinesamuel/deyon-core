import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillItemHmoStatusEnum } from '@modules/core/entities/billItem.entity';

class BillItemDto {
  @ApiProperty({ description: 'Medical service UUID' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ description: 'Line item description' })
  serviceDescription: string;

  @ApiProperty({ example: 5000, description: 'Unit price in minor units' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 0, description: 'Discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 0, description: 'Tax amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ enum: BillItemHmoStatusEnum })
  @IsOptional()
  @IsEnum(BillItemHmoStatusEnum)
  hmoStatus?: BillItemHmoStatusEnum;

  @ApiPropertyOptional({ description: 'HMO covered amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hmoCoveredAmount?: number;

  @ApiPropertyOptional({ description: 'Patient liability amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  patientLiabilityAmount?: number;

  @ApiPropertyOptional({ description: 'HMO contract UUID' })
  @IsOptional()
  @IsUUID()
  hmoContractId?: string;
}

export class AddBillItemsDto {
  @ApiProperty({ type: [BillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];
}
