import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class CreateHmoRulesDto {
  @ApiProperty({ example: 'c6b23ca7-c6a7-425b-9320-882fbfa36f23' })
  @IsUUID()
  hmoProviderId: string;

  @ApiProperty({ example: 'c6b23ca7-c6a7-425b-9320-882fbfa36f23' })
  @IsUUID()
  triggerServiceId: string;

  @ApiProperty({
    example: [{ condition: 'age > 18', action: 'apply_discount' }],
    description: 'Array of rule logic objects',
  })
  @IsArray()
  logic: Record<string, unknown>[];

  @ApiProperty({ example: 'This service is not covered under your plan.' })
  @IsString()
  errorMessage: string;
}
