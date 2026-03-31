import { Controller, Get } from '@nestjs/common';

@Controller('hmo')
export class HmoController {
  @Get('')
  verifyPatientHmoEnrollment() {} // NOSONAR
}
