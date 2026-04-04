import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LabReferralResultItemDto {
  @ApiProperty({ description: 'Lab referral item UUID' })
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional({ description: 'Result value' })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Whether result is abnormal' })
  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;
}

export class ReceiveResultsDto {
  @ApiProperty({ type: [LabReferralResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabReferralResultItemDto)
  results: LabReferralResultItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
