import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID } from 'class-validator';

export class CreatePriceChangeRequestDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 7500 })
  @IsNumber()
  requestedPrice: number;

  @ApiProperty({ example: 'Updated consultation fee' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Market adjustment' })
  @IsString()
  reason: string;
}
