import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SystemConfig } from '@modules/core/entities/systemConfig.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class SystemConfigRepository extends BaseRepository<SystemConfig> {
  private readonly logger = new Logger(SystemConfigRepository.name);

  constructor(
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
  ) {
    super(systemConfigRepo.target, systemConfigRepo.manager, systemConfigRepo.queryRunner);
  }

  async findByKey(key: string, em?: EntityManager): Promise<SystemConfig | null> {
    const repo = em ? em.getRepository(SystemConfig) : this;
    return repo.findOne({ where: { key } });
  }
}
