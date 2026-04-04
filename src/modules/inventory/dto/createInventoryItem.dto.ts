import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInventoryItemDto {
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsNumber()
  currentStock: number;

  @IsNumber()
  reorderLevel: number;

  @IsNumber()
  unitCost: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
