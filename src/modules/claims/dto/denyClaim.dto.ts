import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DenyClaimDto {
  @ApiProperty({ description: 'Reason for denial' })
  @IsString()
  @MinLength(10)
  denialReason: string;
}
