import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Roster, RosterStatusEnum } from '@modules/core/entities/roster.entity';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class RosterRepository extends BaseRepository<Roster> {
  private readonly logger = new Logger(RosterRepository.name);

  constructor(@InjectRepository(Roster) private readonly repo: Repository<Roster>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createRoster(data: Partial<Roster>, em?: EntityManager): Promise<Roster> {
    const repo = em ? em.getRepository(Roster) : this;
    const roster = repo.create(data);
    return repo.save(roster);
  }

  updateRoster(id: string, data: Partial<Roster>, em?: EntityManager): Promise<Roster> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord({ id }, data as any, entityManager);
  }

  async publishRoster(id: string, publishedById: string, em?: EntityManager): Promise<Roster> {
    const entityManager = em ?? this.manager;
    const roster = await this.findOneOrFailIfNotExists({ where: { id } }, entityManager);

    if (roster.status !== RosterStatusEnum.DRAFT) {
      throw new BadRequestException('Only draft rosters can be published');
    }

    return this.updateExistingRecord(
      { id },
      { status: RosterStatusEnum.PUBLISHED, publishedAt: new Date(), publishedById } as any,
      entityManager,
    );
  }

  async softDeleteRoster(id: string, em?: EntityManager): Promise<Roster> {
    const entityManager = em ?? this.manager;
    const roster = await this.findOneOrFailIfNotExists({ where: { id } }, entityManager);

    if (roster.status !== RosterStatusEnum.DRAFT) {
      throw new BadRequestException('Only draft rosters can be deleted');
    }

    return entityManager.getRepository(Roster).softRemove(roster);
  }
}
