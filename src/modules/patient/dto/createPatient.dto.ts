import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GenderEnum, PaymentTypeEnum } from '@modules/core/entities/patient.entity';

class NextOfKinDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: '10 Main Street, Lagos' })
  @IsString()
  address: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phoneNumber: string;
}

export class CreatePatientDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstname: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastname: string;

  @ApiProperty({ example: 'Michael' })
  @IsString()
  middlename: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: GenderEnum, example: GenderEnum.MALE })
  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @ApiProperty({ example: 'O+' })
  @IsString()
  bloodGroup: string;

  @ApiProperty({ example: 'single' })
  @IsString()
  maritalStatus: string;

  @ApiProperty({ example: '10 Main Street, Lagos' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Nigerian' })
  @IsString()
  nationality: string;

  @ApiProperty({ enum: PaymentTypeEnum, example: PaymentTypeEnum.CASH })
  @IsEnum(PaymentTypeEnum)
  paymentType: PaymentTypeEnum;

  @ApiProperty({ type: NextOfKinDto })
  @IsObject()
  @ValidateNested()
  @Type(() => NextOfKinDto)
  nextOfKin: NextOfKinDto;

  @ApiPropertyOptional({ example: 'Engineer' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ description: 'LGA UUID' })
  @IsOptional()
  @IsUUID()
  lgaId?: string;
}
