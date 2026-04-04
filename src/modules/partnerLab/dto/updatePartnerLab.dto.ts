import { PartialType } from '@nestjs/swagger';
import { CreatePartnerLabDto } from './createPartnerLab.dto';

export class UpdatePartnerLabDto extends PartialType(CreatePartnerLabDto) {}
