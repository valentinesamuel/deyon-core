import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RetractClaimDto {
  @ApiProperty({ description: 'Reason for retraction' })
  @IsString()
  @MinLength(10)
  retractionNotes: string;
}
