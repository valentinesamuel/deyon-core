import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTestCatalogDto {
  @IsOptional()
  @IsUUID()
  serviceCodeId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sampleType?: string;

  @IsOptional()
  @IsString()
  defaultUnit?: string;

  @IsOptional()
  @IsString()
  methodology?: string;

  @IsOptional()
  @IsString()
  preparationInstructions?: string;
}
