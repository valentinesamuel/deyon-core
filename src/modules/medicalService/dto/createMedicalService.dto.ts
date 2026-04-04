import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { MedicalServiceDepartmentEnum } from '@modules/core/entities/medicalService.entity';

export class CreateMedicalServiceDto {
  @ApiProperty({ example: 'CONS-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'General Consultation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'A routine general consultation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  medicalServiceCategoryId: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  defaultPrice: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRestricted?: boolean;

  @ApiPropertyOptional({ example: 'Requires specialist referral' })
  @IsOptional()
  @IsString()
  restrictionReason?: string;

  @ApiPropertyOptional({
    enum: MedicalServiceDepartmentEnum,
    example: MedicalServiceDepartmentEnum.FRONT_DESK,
  })
  @IsOptional()
  @IsEnum(MedicalServiceDepartmentEnum)
  department?: MedicalServiceDepartmentEnum;
}
