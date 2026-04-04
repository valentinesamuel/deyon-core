import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClaimItemDto } from './createClaim.dto';

export class UpdateClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBilledAmount?: number;

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
