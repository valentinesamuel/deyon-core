import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CARD' })
  @IsString()
  alias: string;
}
