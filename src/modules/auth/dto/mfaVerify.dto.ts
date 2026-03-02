import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({ example: 'hex-mfa-token' })
  @IsString()
  mfaToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  totpCode: string;
}
