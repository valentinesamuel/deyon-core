import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class EnrollPatientHmoDto {
  @ApiProperty({ description: 'HMO Provider UUID' })
  @IsUUID()
  hmoProviderId: string;

  @ApiProperty({ example: 'ACME Health HMO' })
  @IsString()
  providerName: string;

  @ApiProperty({ example: 'ENR-0001234' })
  @IsString()
  enrollmentId: string;

  @ApiProperty({ example: 'STANDARD' })
  @IsString()
  planType: string;

  @ApiProperty({ example: '2027-12-31' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  copayAmount: number;
}
