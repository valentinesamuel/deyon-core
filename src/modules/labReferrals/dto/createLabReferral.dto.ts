import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LabReferralDirectionEnum } from '@modules/core/entities/labReferral.entity';
import { LabPriorityEnum } from '@modules/core/entities/labOrder.entity';

export class CreateLabReferralItemDto {
  @ApiProperty({ description: 'Name of the test to be referred' })
  @IsString()
  testName: string;
}

export class CreateLabReferralDto {
  @ApiProperty({ enum: LabReferralDirectionEnum })
  @IsEnum(LabReferralDirectionEnum)
  direction: LabReferralDirectionEnum;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Patient phone number override' })
  @IsOptional()
  @IsString()
  patientPhoneNumber?: string;

  @ApiPropertyOptional({ description: 'Partner lab UUID (required for outbound)' })
  @IsOptional()
  @IsUUID()
  partnerLabId?: string;

  @ApiPropertyOptional({ enum: LabPriorityEnum, default: LabPriorityEnum.ROUTINE })
  @IsOptional()
  @IsEnum(LabPriorityEnum)
  priority?: LabPriorityEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateLabReferralItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabReferralItemDto)
  items: CreateLabReferralItemDto[];
}
