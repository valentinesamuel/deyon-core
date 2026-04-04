import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateEpisodeDto {
  @ApiPropertyOptional({ example: 'Patient recovering well' })
  @IsOptional()
  @IsString()
  notes?: string;
}
