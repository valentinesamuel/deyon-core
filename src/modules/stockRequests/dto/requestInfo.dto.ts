import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestInfoDto {
  @ApiProperty({ description: 'Details of the information needed' })
  @IsString()
  @MinLength(5)
  notes: string;
}
