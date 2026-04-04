import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateRosterDto {
  @ApiProperty({ example: '2026-04-07', description: 'ISO date of the week start (Monday)' })
  @IsDateString()
  weekStartDate: string;

  @ApiPropertyOptional({ example: 'Standard week rotation' })
  @IsOptional()
  @IsString()
  notes?: string;
}
