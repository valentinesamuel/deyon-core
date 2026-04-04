import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddRosterAssignmentDto {
  @ApiProperty({ description: 'Staff UUID' })
  @IsUUID()
  staffId: string;

  @ApiProperty({ description: 'ShiftSchedule UUID' })
  @IsUUID()
  shiftScheduleId: string;
}
