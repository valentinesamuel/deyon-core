import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@shared/decorators/isPublic.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('states')
  @Public()
  getAllStates(@Query('country') _country?: string) {
    // country param reserved for future multi-country support; currently only NG data is available
    return this.locationsService.getAllStates();
  }

  @Get('lgas')
  @Public()
  getLgas(@Query('stateId') stateId?: string) {
    return this.locationsService.getLgas(stateId);
  }
}
