import { PartialType } from '@nestjs/swagger';
import { CreateRosterDto } from './createRoster.dto';

export class UpdateRosterDto extends PartialType(CreateRosterDto) {}
