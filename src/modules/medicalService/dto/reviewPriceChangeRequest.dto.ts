import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PriceChangeStatusEnum } from '@modules/core/entities/priceChange.entity';

export class ReviewPriceChangeRequestDto {
  @ApiProperty({ enum: PriceChangeStatusEnum, example: PriceChangeStatusEnum.APPROVED })
  @IsEnum(PriceChangeStatusEnum)
  status: PriceChangeStatusEnum;

  @ApiPropertyOptional({ example: 'Approved after review' })
  @IsOptional()
  @IsString()
  reason?: string;
}
