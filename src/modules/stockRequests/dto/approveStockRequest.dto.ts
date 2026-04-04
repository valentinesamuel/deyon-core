import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveItemDto {
  @ApiProperty({ description: 'Restock request item UUID' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Approved quantity' })
  @IsInt()
  @Min(0)
  approvedQuantity: number;
}

export class ApproveStockRequestDto {
  @ApiProperty({ type: [ApproveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveItemDto)
  approvals: ApproveItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
