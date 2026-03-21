import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkReassignDto {
  @IsUUID()
  targetRoleId: string;
}

class StaffAssignment {
  @IsUUID()
  staffId: string;

  @IsUUID()
  targetRoleId: string;
}

export class IndividualReassignDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAssignment)
  assignments: StaffAssignment[];
}
