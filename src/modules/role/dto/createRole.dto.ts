import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ArrayMinSize } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'invite-token-string' })
  @IsString()
  name: string;

  @ApiProperty({ example: ['create-user', 'update-user'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissions: string[];
}
