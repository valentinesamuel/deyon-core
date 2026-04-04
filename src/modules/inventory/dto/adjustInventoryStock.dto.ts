import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { StockAdjustmentTypeEnum } from '@modules/core/entities/stockAdjustment.entity';

export class AdjustInventoryStockDto {
  @IsEnum(StockAdjustmentTypeEnum)
  adjustmentType: StockAdjustmentTypeEnum;

  @IsInt()
  quantity: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;
}
