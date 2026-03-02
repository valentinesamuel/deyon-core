import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class MfaSetupConfirmDto {
  @ApiProperty({ example: 'hex-setup-token' })
  @IsString()
  setupToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  totpCode: string;
}
