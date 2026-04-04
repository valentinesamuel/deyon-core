import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateMedicalServiceCategoryDto {
  @ApiProperty({ example: 'Radiology' })
  @IsString()
  name: string;
}
