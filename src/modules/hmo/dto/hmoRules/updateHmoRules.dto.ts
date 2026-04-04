import { PartialType } from '@nestjs/swagger';
import { CreateHmoRulesDto } from './createHmoRules.dto';

export class UpdateHmoRulesDto extends PartialType(CreateHmoRulesDto) {}
