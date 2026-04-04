import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { DayOfWeekEnum, ShiftTimeOfDayEnum } from '@modules/core/entities/shiftSchedule.entity';

export class CreateShiftScheduleDto {
  @ApiProperty({ example: ShiftTimeOfDayEnum.MORNING, enum: ShiftTimeOfDayEnum })
  @IsEnum(ShiftTimeOfDayEnum)
  timeOfDay: ShiftTimeOfDayEnum;

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '16:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: DayOfWeekEnum.MONDAY, enum: DayOfWeekEnum })
  @IsEnum(DayOfWeekEnum)
  day: DayOfWeekEnum;
}
