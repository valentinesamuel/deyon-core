import { HMOContractCoverageTypeEnum } from '@modules/core/entities/hmoContract.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsUUID } from 'class-validator';

export class CreateHmoContractDto {
  @ApiProperty({ example: 'c6b23ca7-c6a7-425b-9320-882fbfa36f23' })
  @IsUUID()
  hmoProviderId: string;

  @ApiProperty({ example: 'c6b23ca7-c6a7-425b-9320-882fbfa36f23' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: HMOContractCoverageTypeEnum.FULL })
  @IsEnum(HMOContractCoverageTypeEnum)
  coverageType: HMOContractCoverageTypeEnum;

  @ApiProperty({ example: 12000 })
  @IsNumber()
  contractedPrice?: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  coveragePercentage?: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  coverageFlatAmount?: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  maxCoveredAmount?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  requiredPreAuthorization: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
