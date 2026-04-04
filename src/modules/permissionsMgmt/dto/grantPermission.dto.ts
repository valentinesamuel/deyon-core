import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class GrantPermissionDto {
  @ApiProperty({ description: 'Permission code to override (e.g. "billing:create")' })
  @IsString()
  permissionCode: string;

  @ApiProperty({ description: 'true = grant; false = revoke' })
  @IsBoolean()
  granted: boolean;
}
