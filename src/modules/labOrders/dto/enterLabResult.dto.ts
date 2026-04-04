import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class EnterLabResultDto {
  @ApiProperty({ description: 'Lab order item UUID' })
  @IsUUID()
  labOrderItemId: string;

  @ApiProperty({ description: 'Result value (numeric or text)' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
