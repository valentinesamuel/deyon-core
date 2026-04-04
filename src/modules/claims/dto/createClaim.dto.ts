import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimItemCategoryEnum } from '@modules/core/entities/claimItem.entity';
import { IsEnum } from 'class-validator';

export class CreateClaimItemDto {
  @ApiPropertyOptional({ description: 'Bill item UUID (optional link to existing bill item)' })
  @IsOptional()
  @IsUUID()
  billItemId?: string;

  @ApiProperty({ description: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: ClaimItemCategoryEnum })
  @IsEnum(ClaimItemCategoryEnum)
  category: ClaimItemCategoryEnum;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  claimedAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOffProtocol?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalJustification?: string;
}

export class CreateClaimDto {
  @ApiProperty({ description: 'Episode UUID' })
  @IsUUID()
  episodeId: string;

  @ApiProperty({ description: 'HMO provider UUID' })
  @IsUUID()
  hmoProviderId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalBilledAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enrollmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preAuthCode?: string;

  @ApiPropertyOptional({ type: [CreateClaimItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateClaimItemDto)
  items?: CreateClaimItemDto[];
}
