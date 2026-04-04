import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResubmitClaimDto {
  @ApiProperty({ description: 'Notes explaining the resubmission changes' })
  @IsString()
  @MinLength(10)
  resubmissionNotes: string;
}
