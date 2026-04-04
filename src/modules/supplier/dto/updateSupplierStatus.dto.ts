import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateSupplierStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
