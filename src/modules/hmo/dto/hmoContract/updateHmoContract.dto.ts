import { PartialType } from '@nestjs/swagger';
import { CreateHmoContractDto } from './createHmoContract.dto';

export class UpdateHmoContractDto extends PartialType(CreateHmoContractDto) {}
