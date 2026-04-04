import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class RecordVitalsDto {
  @ApiProperty({ description: 'Episode UUID' })
  @IsUUID()
  episodeId: string;

  @ApiProperty({ example: 36.6, description: 'Temperature in Celsius' })
  @IsNumber()
  @Min(25)
  @Max(45)
  celsiusTemperature: number;

  @ApiProperty({ example: 120, description: 'Systolic blood pressure (mmHg)' })
  @IsNumber()
  @Min(50)
  @Max(300)
  systolicBloodPressure: number;

  @ApiProperty({ example: 80, description: 'Diastolic blood pressure (mmHg)' })
  @IsNumber()
  @Min(20)
  @Max(200)
  diastolicBloodPressure: number;

  @ApiProperty({ example: 72, description: 'Heart rate (bpm)' })
  @IsNumber()
  @Min(20)
  @Max(300)
  heartRate: number;

  @ApiProperty({ example: 16, description: 'Respiratory rate (breaths/min)' })
  @IsNumber()
  @Min(1)
  @Max(60)
  respiratoryRate: number;

  @ApiProperty({ example: 98.0, description: 'Oxygen saturation (%)' })
  @IsNumber()
  @Min(50)
  @Max(100)
  oxygenSaturation: number;

  @ApiProperty({ example: 70.0, description: 'Weight in kilograms' })
  @IsNumber()
  @Min(0.5)
  @Max(500)
  kilogramWeight: number;

  @ApiProperty({ example: 175.0, description: 'Height in centimetres' })
  @IsNumber()
  @Min(20)
  @Max(300)
  centimetreHeight: number;
}
