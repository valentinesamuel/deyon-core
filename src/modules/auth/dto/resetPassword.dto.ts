import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsStrongPassword } from '@shared/decorators/isStrongPassword.decorator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-string' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewStr0ng!Pass#2024' })
  @IsStrongPassword()
  newPassword: string;
}
