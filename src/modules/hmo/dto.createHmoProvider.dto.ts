import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsUrl, IsNumber, IsBoolean } from 'class-validator';

export class CreateHmoProviderDto {
  @ApiProperty({ example: 'Axa Manxard' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2FK4626' })
  @IsString()
  code: string;

  @ApiProperty({ example: '+2345833947328' })
  @IsString()
  contactPhone: string;

  @ApiProperty({ example: 'test@test.com' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: 'test@test.com' })
  @IsEmail()
  claimsEmail: string;

  @ApiProperty({ example: 'test@test.com' })
  @IsEmail()
  retractionEmail: string;

  @ApiProperty({ example: '123 street, ikeja' })
  @IsEmail()
  address: string;

  @ApiProperty({ example: 'http://test@test.com' })
  @IsUrl()
  portalUrl: string;

  @ApiProperty({ example: '+2345833947328' })
  @IsString()
  relationshipManagerPhone: string;

  @ApiProperty({ example: '12300' })
  @IsNumber()
  defaultCopay: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: string;
}
