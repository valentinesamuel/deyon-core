import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { ReferenceGenderEnum } from '@modules/core/entities/referenceRange.entity';

export class UpdateReferenceRangeDto {
  @IsOptional()
  @IsEnum(ReferenceGenderEnum)
  gender?: ReferenceGenderEnum;

  @IsOptional()
  @IsInt()
  minAgeYears?: number;

  @IsOptional()
  @IsInt()
  maxAgeYears?: number;

  @IsOptional()
  @IsNumber()
  lowerBound?: number;

  @IsOptional()
  @IsNumber()
  upperBound?: number;

  @IsOptional()
  @IsNumber()
  criticalLowerBound?: number;

  @IsOptional()
  @IsNumber()
  criticalUpperBound?: number;
}
