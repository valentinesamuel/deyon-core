import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTestCatalogDto {
  @IsUUID()
  serviceCodeId: string;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  sampleType: string;

  @IsString()
  defaultUnit: string;

  @IsOptional()
  @IsString()
  methodology?: string;

  @IsOptional()
  @IsString()
  preparationInstructions?: string;
}
