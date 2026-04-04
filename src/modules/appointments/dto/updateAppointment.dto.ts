import { PartialType, OmitType } from '@nestjs/swagger';
import { BookAppointmentDto } from './bookAppointment.dto';

export class UpdateAppointmentDto extends PartialType(
  OmitType(BookAppointmentDto, ['patientId'] as const),
) {}
