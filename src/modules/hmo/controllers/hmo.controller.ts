import { Controller, Get } from '@nestjs/common';

@Controller('hmo')
export class HmoController {
  constructor() {}

  @Get('')
  async verifyPatientHmoEnrollment() {}
}
