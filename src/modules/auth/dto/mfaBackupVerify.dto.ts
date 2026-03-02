import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MfaBackupVerifyDto {
  @ApiProperty({ example: 'hex-mfa-token' })
  @IsString()
  mfaToken: string;

  @ApiProperty({ example: 'ABCDE12345' })
  @IsString()
  backupCode: string;
}
