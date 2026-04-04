import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ClaimWithdrawalReasonEnum } from '@modules/core/entities/claim.entity';

export class WithdrawClaimDto {
  @ApiProperty({ enum: ClaimWithdrawalReasonEnum })
  @IsEnum(ClaimWithdrawalReasonEnum)
  reason: ClaimWithdrawalReasonEnum;
}
