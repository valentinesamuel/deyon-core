import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateMedicalServiceStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
