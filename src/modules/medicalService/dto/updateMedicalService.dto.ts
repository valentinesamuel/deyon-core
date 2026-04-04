import { PartialType } from '@nestjs/swagger';
import { CreateMedicalServiceDto } from './createMedicalService.dto';

export class UpdateMedicalServiceDto extends PartialType(CreateMedicalServiceDto) {}
