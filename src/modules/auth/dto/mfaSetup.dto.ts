import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MfaSetupDto {
  @ApiProperty({ example: 'hex-setup-token' })
  @IsString()
  setupToken: string;
}
