import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from './createSupplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
