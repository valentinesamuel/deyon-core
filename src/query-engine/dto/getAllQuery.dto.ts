import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import type { QueryInput } from '../types/query.types';

export class GetAllQueryDto implements QueryInput {
  @IsOptional()
  @IsString()
  where?: string;

  @IsOptional()
  @IsObject()
  filter?: Record<string, Record<string, string>>;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsObject()
  search?: Record<string, Record<string, string>>;

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsObject()
  aggregate?: Record<string, string>;

  @IsOptional()
  @IsString()
  having?: string;

  @IsOptional()
  @IsString()
  include?: string;

  @IsOptional()
  @IsObject()
  fields?: Record<string, string>;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  withDeleted?: boolean;
}
