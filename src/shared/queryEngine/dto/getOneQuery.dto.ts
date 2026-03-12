import { IsOptional, IsString } from 'class-validator';

export class GetOneQueryDto {
  @IsOptional()
  @IsString()
  fields?: string;

  @IsOptional()
  @IsString()
  include?: string;
}
