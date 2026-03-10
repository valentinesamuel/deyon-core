import { IsString, Length } from 'class-validator';

export class BootstrapSystemDto {
  @IsString()
  @Length(6, 6)
  totpCode: string;
}
