import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RosterService } from '../service/roster.service';
import { Roster } from '@modules/core/entities/roster.entity';

type TFetchRosterByIdParams = { id: string };
type TFetchRosterByIdResult = { roster: Roster };

@Injectable()
export class FetchRosterByIdUsecase extends Usecase<
  TFetchRosterByIdResult,
  TFetchRosterByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly rosterService: RosterService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchRosterByIdParams,
  ): Promise<TFetchRosterByIdResult> {
    const roster = await this.rosterService.getRosterOrFail(
      { where: { id: params.id }, relations: { publishedBy: true, assignments: true } },
      _em,
    );
    return { roster };
  }
}
