import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMedicalServiceCategoryDto {
  @ApiPropertyOptional({ example: 'Radiology' })
  @IsOptional()
  @IsString()
  name?: string;
}
