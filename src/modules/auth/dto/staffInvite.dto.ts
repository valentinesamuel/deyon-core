import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsUUID } from 'class-validator';

export class StaffInviteDto {
  @ApiProperty({ example: 'john@hospital.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'uuid-role-id' })
  @IsUUID()
  roleId: string;

  @ApiProperty({ example: 'uuid-department-id' })
  @IsUUID()
  departmentId: string;
}
