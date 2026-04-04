import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateInventoryCategoryDto {
  @ApiProperty({ example: 'Surgical Supplies' })
  @IsString()
  name: string;
}
