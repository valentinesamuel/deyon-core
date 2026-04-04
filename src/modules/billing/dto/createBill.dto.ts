import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { BillTypeEnum } from '@modules/core/entities/bill.entity';

export class CreateBillDto {
  @ApiProperty({ enum: BillTypeEnum, description: 'Bill type' })
  @IsEnum(BillTypeEnum)
  type: BillTypeEnum;

  @ApiPropertyOptional({ description: 'Patient UUID (required when not walk-in)' })
  @ValidateIf((o) => !o.isWalkIn)
  @IsUUID()
  patientId?: string;

  @ApiProperty({ description: 'Department UUID' })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({ description: 'Episode UUID' })
  @IsOptional()
  @IsUUID()
  episodeId?: string;

  @ApiPropertyOptional({ description: 'Cashier shift UUID' })
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'Walk-in (no registered patient)', default: false })
  @IsOptional()
  @IsBoolean()
  isWalkIn?: boolean;

  @ApiPropertyOptional({ description: 'Walk-in customer name (required when isWalkIn=true)' })
  @ValidateIf((o) => o.isWalkIn === true)
  @IsString()
  walkInCustomerName?: string;

  @ApiPropertyOptional({ description: 'Walk-in phone (required when isWalkIn=true)' })
  @ValidateIf((o) => o.isWalkIn === true)
  @IsString()
  walkInPhone?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
