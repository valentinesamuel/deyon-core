import { PartialType } from '@nestjs/swagger';
import { CreateShiftScheduleDto } from './createShiftSchedule.dto';

export class UpdateShiftScheduleDto extends PartialType(CreateShiftScheduleDto) {}
