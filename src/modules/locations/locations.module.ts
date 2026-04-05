import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { State } from '@modules/core/entities/state.entity';
import { Lga } from '@modules/core/entities/lga.entity';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([State, Lga])],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
