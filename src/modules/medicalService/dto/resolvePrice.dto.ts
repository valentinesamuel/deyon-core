import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ResolvePriceDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({ example: 'uuid-of-hmo-provider' })
  @IsOptional()
  @IsUUID()
  hmoProviderId?: string;
}
