import { PartialType } from '@nestjs/swagger';
import { CreateHmoProviderDto } from './createHmoProvider.dto';

export class UpdateHmoProviderDto extends PartialType(CreateHmoProviderDto) {}
