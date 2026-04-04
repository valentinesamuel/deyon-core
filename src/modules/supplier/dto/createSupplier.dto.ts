import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'MedSupply Co.' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: 'contact@medsupply.com', required: false })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({ example: '12 Industrial Avenue, Lagos', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
