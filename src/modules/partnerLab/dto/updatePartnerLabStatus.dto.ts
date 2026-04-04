import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PartnerLabStatusEnum } from '@modules/core/entities/partnerLab.entity';

export class UpdatePartnerLabStatusDto {
  @ApiProperty({ example: PartnerLabStatusEnum.ACTIVE, enum: PartnerLabStatusEnum })
  @IsEnum(PartnerLabStatusEnum)
  status: PartnerLabStatusEnum;
}
