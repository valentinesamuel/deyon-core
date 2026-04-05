import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { Public } from '@shared/decorators/isPublic.decorator';
import { NigerianBanksService } from './nigerianBanks.service';

@Controller('nigerian-banks')
export class NigerianBanksController {
  constructor(private readonly nigerianBanksService: NigerianBanksService) {}

  @Get()
  @Public()
  async getAllBanks() {
    return this.nigerianBanksService.getBanks();
  }

  @Get(':id')
  @Public()
  async getBankById(@Param('id', ParseIntPipe) id: number) {
    const bank = await this.nigerianBanksService.getBankById(id);
    if (!bank) throw new NotFoundException(`Bank with id ${id} not found`);
    return bank;
  }
}
