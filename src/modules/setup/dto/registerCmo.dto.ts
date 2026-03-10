import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterCmoDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  @MinLength(8)
  password: string;
}
