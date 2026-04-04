import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class OpenEpisodeDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ example: 'Post-op follow-up notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
