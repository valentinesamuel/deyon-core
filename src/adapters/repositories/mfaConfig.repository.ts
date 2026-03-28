import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MfaConfig } from '@modules/core/entities/mfaConfig.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class MfaConfigRepository extends BaseRepository<MfaConfig> {
  private readonly logger = new Logger(MfaConfigRepository.name);

  constructor(
    @InjectRepository(MfaConfig)
    private readonly repo: Repository<MfaConfig>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByStaffId(staffId: string, em?: EntityManager): Promise<MfaConfig | null> {
    const repo = em ? em.getRepository(MfaConfig) : this;
    return repo.findOne({
      where: { staffId },
      select: ['id', 'staffId', 'encryptedSecret', 'backupCodeHashes', 'usedBackupCodes'],
    });
  }

  async saveOrUpdate(
    staffId: string,
    data: Partial<MfaConfig>,
    em?: EntityManager,
  ): Promise<MfaConfig> {
    const repo = em ? em.getRepository(MfaConfig) : this;
    let config = await repo.findOne({ where: { staffId } });
    if (config) {
      Object.assign(config, data);
    } else {
      config = repo.create({ staffId, ...data });
    }
    return repo.save(config);
  }
}
