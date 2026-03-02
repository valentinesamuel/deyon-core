import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({
    example: 'exekiel@doctor.com',
    description: 'user email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '@strin24,/25',
    description: 'user password',
  })
  @IsString()
  password: string;
}
