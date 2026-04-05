import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@shared/decorators/isPublic.decorator';
import { LocationsService } from './locations.service';

@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('nigerian-states')
  @Public()
  getAllStates() {
    return this.locationsService.getAllStates();
  }

  @Get('lgas')
  @Public()
  getLgas(@Query('stateId') stateId?: string) {
    return this.locationsService.getLgas(stateId ? parseInt(stateId, 10) : undefined);
  }
}
