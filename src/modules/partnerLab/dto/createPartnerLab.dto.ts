import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { PartnerLabStatusEnum } from '@modules/core/entities/partnerLab.entity';

export class CreatePartnerLabDto {
  @ApiProperty({ example: 'LabCorp Nigeria' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'LAB001' })
  @IsString()
  code: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ example: '12 Lab Road, Lagos' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'lab@labcorp.com' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({ example: ['hematology', 'biochemistry'] })
  @IsArray()
  @IsString({ each: true })
  specializations: string[];

  @ApiProperty({ example: PartnerLabStatusEnum.ACTIVE, enum: PartnerLabStatusEnum })
  @IsEnum(PartnerLabStatusEnum)
  status: PartnerLabStatusEnum;
}
