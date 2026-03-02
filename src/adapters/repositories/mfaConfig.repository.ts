import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MfaConfig } from '@modules/core/entities/mfaConfig.entity';

@Injectable()
export class MfaConfigRepository extends Repository<MfaConfig> {
  private readonly logger = new Logger(MfaConfigRepository.name);

  constructor(
    @InjectRepository(MfaConfig)
    private readonly repo: Repository<MfaConfig>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByStaffId(staffId: string): Promise<MfaConfig | null> {
    return this.repo.findOne({
      where: { staffId },
      select: ['id', 'staffId', 'encryptedSecret', 'backupCodeHashes', 'usedBackupCodes'],
    });
  }

  async saveOrUpdate(staffId: string, data: Partial<MfaConfig>): Promise<MfaConfig> {
    let config = await this.repo.findOne({ where: { staffId } });
    if (config) {
      Object.assign(config, data);
    } else {
      config = this.create({ staffId, ...data });
    }
    return this.save(config);
  }
}
