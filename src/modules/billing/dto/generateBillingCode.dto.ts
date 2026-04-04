import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
import { MedicalServiceDepartmentEnum } from '@modules/core/entities/medicalService.entity';

export class GenerateBillingCodeDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: MedicalServiceDepartmentEnum })
  @IsEnum(MedicalServiceDepartmentEnum)
  department: MedicalServiceDepartmentEnum;

  @ApiProperty({ example: 15000, description: 'Total amount for this code' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
