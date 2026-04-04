import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { PaymentMethodEnum } from '@modules/core/entities/payment.entity';

export class RecordPaymentDto {
  @ApiProperty({ example: 5000, description: 'Payment amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethodEnum, description: 'Payment method' })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Cashier shift UUID' })
  @IsOptional()
  @IsUUID()
  shiftId?: string;
}
