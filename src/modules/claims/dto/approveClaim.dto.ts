import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ApproveClaimDto {
  @ApiProperty({ description: 'Approved amount' })
  @IsNumber()
  @Min(0)
  approvedAmount: number;
}
