import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RestockRequestUrgencyEnum } from '@modules/core/entities/restockRequest.entity';

export class CreateStockRequestItemDto {
  @ApiProperty({ description: 'Inventory item UUID' })
  @IsUUID()
  inventoryId: string;

  @ApiProperty({ description: 'Quantity requested' })
  @IsInt()
  @Min(1)
  requestedQuantity: number;
}

export class CreateStockRequestDto {
  @ApiPropertyOptional({
    enum: RestockRequestUrgencyEnum,
    default: RestockRequestUrgencyEnum.NORMAL,
  })
  @IsOptional()
  @IsEnum(RestockRequestUrgencyEnum)
  urgency?: RestockRequestUrgencyEnum;

  @ApiProperty({ description: 'Reason for restock request' })
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockRequestItemDto)
  items: CreateStockRequestItemDto[];
}
