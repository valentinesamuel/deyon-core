import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsPhoneNumber, IsOptional } from 'class-validator';
import { IsStrongPassword } from '@shared/decorators/isStrongPassword.decorator';

export class AcceptInviteDto {
  @ApiProperty({ example: 'invite-token-string' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ example: 'Str0ng!Pass#2024' })
  @IsStrongPassword()
  password: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  specialization?: string;
}
