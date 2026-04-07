import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { State } from '@modules/core/entities/state.entity';
import { Lga } from '@modules/core/entities/lga.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(State) private readonly stateRepo: Repository<State>,
    @InjectRepository(Lga) private readonly lgaRepo: Repository<Lga>,
  ) {}

  getAllStates() {
    return this.stateRepo.find({ select: ['id', 'name', 'shortname'] });
  }

  getLgas(stateId?: string) {
    if (stateId) {
      return this.lgaRepo.find({
        where: { stateId },
        select: ['id', 'name', 'shortname', 'stateId'],
      });
    }
    return this.lgaRepo.find({ select: ['id', 'name', 'shortname', 'stateId'] });
  }
}
