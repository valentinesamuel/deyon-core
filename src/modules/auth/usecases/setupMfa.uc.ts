import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MfaSetupDto } from '../dto/mfaSetup.dto';
import { MfaService } from '../services/mfa.service';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';

export interface SetupMfaResult {
  qrCodeDataUrl: string;
  otpauthUrl: string;
}

@Injectable()
export class SetupMfaUsecase extends Usecase<SetupMfaResult> {
  constructor(
    private readonly mfaService: MfaService,
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly staffRepository: StaffRepository,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: MfaSetupDto & { mfaStaffId: string },
  ): Promise<SetupMfaResult> {
    const { mfaStaffId } = params;

    const staff = await this.staffRepository.findOne({ where: { id: mfaStaffId } });
    if (!staff) throw new UnauthorizedException('Staff not found');

    const { encryptedSecret, otpauthUrl, qrCodeDataUrl } = await this.mfaService.generateSecret(
      staff.email,
    );

    // Store encrypted secret (not yet confirmed)
    await this.mfaConfigRepository.saveOrUpdate(mfaStaffId, { encryptedSecret });

    return { qrCodeDataUrl, otpauthUrl };
  }
}
