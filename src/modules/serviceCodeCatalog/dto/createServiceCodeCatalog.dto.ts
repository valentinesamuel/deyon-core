import { IsOptional, IsUUID } from 'class-validator';

export class CreateServiceCodeCatalogDto {
  @IsUUID()
  medicalCodeId: string;

  @IsOptional()
  @IsUUID()
  hmoProviderId?: string;
}
