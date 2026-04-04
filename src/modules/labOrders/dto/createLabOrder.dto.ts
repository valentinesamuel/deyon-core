import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LabOrderTypeEnum, LabPriorityEnum } from '@modules/core/entities/labOrder.entity';

class LabOrderItemDto {
  @ApiProperty({ description: 'Service code catalog UUID' })
  @IsUUID()
  serviceCodeId: string;
}

export class CreateLabOrderDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Doctor (staff) UUID' })
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional({ description: 'Episode UUID' })
  @IsOptional()
  @IsUUID()
  episodeId?: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: LabOrderTypeEnum, description: 'Order type' })
  @IsEnum(LabOrderTypeEnum)
  type: LabOrderTypeEnum;

  @ApiPropertyOptional({
    enum: LabPriorityEnum,
    description: 'Priority',
    default: LabPriorityEnum.ROUTINE,
  })
  @IsOptional()
  @IsEnum(LabPriorityEnum)
  priority?: LabPriorityEnum;

  @ApiProperty({ type: [LabOrderItemDto], description: 'Lab tests to order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabOrderItemDto)
  items: LabOrderItemDto[];
}
