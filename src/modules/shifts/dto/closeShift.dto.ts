import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @ApiProperty({ description: 'Actual closing cash balance' })
  @IsNumber()
  @Min(0)
  closingBalance: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
