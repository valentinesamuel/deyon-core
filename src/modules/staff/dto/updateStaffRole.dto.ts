import { IsUUID } from 'class-validator';

export class UpdateStaffRoleDto {
  @IsUUID()
  roleId: string;
}
