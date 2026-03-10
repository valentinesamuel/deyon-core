import { Injectable, CanActivate, ExecutionContext, ConflictException } from '@nestjs/common';
import { SystemConfigRepository } from '@adapters/repositories/systemConfig.repository';

@Injectable()
export class SetupNotCompleteGuard implements CanActivate {
  constructor(private readonly systemConfigRepository: SystemConfigRepository) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const config = await this.systemConfigRepository.findByKey('setup_complete');
    if ((config?.value as { completed?: boolean })?.completed === true) {
      throw new ConflictException('System setup has already been completed');
    }
    return true;
  }
}
