import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@shared/decorators/isPublic.decorator';
import { BanksService } from './banks.service';

@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  @Public()
  getBanks(@Query('country') country: string = 'NG') {
    return this.banksService.getBanks(country.toUpperCase());
  }
}
