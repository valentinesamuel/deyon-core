import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@modules/core/entities/systemConfig.entity';

@Injectable()
export class SystemConfigRepository extends Repository<SystemConfig> {
  private readonly logger = new Logger(SystemConfigRepository.name);

  constructor(
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
  ) {
    super(systemConfigRepo.target, systemConfigRepo.manager, systemConfigRepo.queryRunner);
  }

  async findByKey(key: string): Promise<SystemConfig | null> {
    return this.findOne({ where: { key } });
  }
}
