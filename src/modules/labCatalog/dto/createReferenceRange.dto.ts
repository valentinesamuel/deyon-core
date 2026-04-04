import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { ReferenceGenderEnum } from '@modules/core/entities/referenceRange.entity';

export class CreateReferenceRangeDto {
  @IsEnum(ReferenceGenderEnum)
  gender: ReferenceGenderEnum;

  @IsOptional()
  @IsInt()
  minAgeYears?: number;

  @IsOptional()
  @IsInt()
  maxAgeYears?: number;

  @IsNumber()
  lowerBound: number;

  @IsNumber()
  upperBound: number;

  @IsOptional()
  @IsNumber()
  criticalLowerBound?: number;

  @IsOptional()
  @IsNumber()
  criticalUpperBound?: number;
}
