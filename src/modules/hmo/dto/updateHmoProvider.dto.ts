import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateHmoProviderDto } from './createHmoProvider.dto';
import { IsBoolean } from 'class-validator';

export class UpdateHmoProviderDto extends PartialType(CreateHmoProviderDto) {}

export class UpdateHmoProviderStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
