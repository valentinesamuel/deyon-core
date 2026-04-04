import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MarkUnfulfillableDto {
  @ApiProperty({ description: 'Reason the prescription cannot be fulfilled' })
  @IsString()
  reason: string;
}
