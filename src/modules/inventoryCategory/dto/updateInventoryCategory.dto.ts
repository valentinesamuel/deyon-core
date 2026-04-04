import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateInventoryCategoryDto {
  @ApiPropertyOptional({ example: 'Surgical Supplies' })
  @IsOptional()
  @IsString()
  name?: string;
}
