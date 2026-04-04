import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ShiftStationEnum } from '@modules/core/entities/shift.entity';

export class OpenShiftDto {
  @ApiProperty({ enum: ShiftStationEnum })
  @IsEnum(ShiftStationEnum)
  station: ShiftStationEnum;

  @ApiProperty({ description: 'Department UUID' })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({ description: 'Opening cash balance (for cashier shifts)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
