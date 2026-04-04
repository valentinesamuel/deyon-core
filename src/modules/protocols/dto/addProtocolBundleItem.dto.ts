import { IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { ServiceCategoryEnum } from '@modules/core/entities/protocolBundleItems.entity';

export class AddProtocolBundleItemDto {
  @IsEnum(ServiceCategoryEnum)
  serviceType: ServiceCategoryEnum;

  @IsUUID()
  serviceId: string;

  @IsBoolean()
  isCompulsory: boolean;
}
