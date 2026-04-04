import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { AppointmentTypeEnum } from '@modules/core/entities/appointment.entity';

export class BookAppointmentDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Doctor (staff) UUID' })
  @IsUUID()
  doctorId: string;

  @ApiProperty({ enum: AppointmentTypeEnum, example: AppointmentTypeEnum.CONSULTATION })
  @IsEnum(AppointmentTypeEnum)
  appointmentType: AppointmentTypeEnum;

  @ApiProperty({ example: 'Persistent headache' })
  @IsString()
  reasonForVisit: string;

  @ApiProperty({ example: '2026-04-10T09:00:00Z' })
  @IsDateString()
  scheduleDate: string;

  @ApiProperty({ example: 30, description: 'Scheduled duration in minutes' })
  @IsInt()
  @Min(5)
  scheduledDuration: number;

  @ApiPropertyOptional({ description: 'Who booked (staff UUID). Defaults to current user.' })
  @IsOptional()
  @IsUUID()
  bookedBy?: string;
}
