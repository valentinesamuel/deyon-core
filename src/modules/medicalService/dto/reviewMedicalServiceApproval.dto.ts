import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MedicalServiceStatusEnum } from '@modules/core/entities/medicalService.entity';

export class ReviewMedicalServiceApprovalDto {
  @ApiProperty({ enum: MedicalServiceStatusEnum, example: MedicalServiceStatusEnum.APPROVED })
  @IsEnum(MedicalServiceStatusEnum)
  status: MedicalServiceStatusEnum;

  @ApiPropertyOptional({ example: 'Looks good' })
  @IsOptional()
  @IsString()
  reason?: string;
}
