import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { QueuePriorityEnum, QueueTypeEnum } from '@modules/core/entities/queueEntry.entity';

export class AddToQueueDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Episode UUID' })
  @IsOptional()
  @IsUUID()
  episodeId?: string;

  @ApiProperty({ enum: QueueTypeEnum, example: QueueTypeEnum.TRIAGE })
  @IsEnum(QueueTypeEnum)
  queueType: QueueTypeEnum;

  @ApiPropertyOptional({ enum: QueuePriorityEnum, example: QueuePriorityEnum.NORMAL })
  @IsOptional()
  @IsEnum(QueuePriorityEnum)
  priority?: QueuePriorityEnum;

  @ApiPropertyOptional({ example: 'Severe chest pain' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ example: 'Needs urgent attention' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Staff UUID to assign' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
