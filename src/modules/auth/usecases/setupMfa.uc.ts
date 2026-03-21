import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MfaSetupDto } from '../dto/mfaSetup.dto';
import { MfaService } from '../services/mfa.service';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface SetupMfaResult {
  qrCodeDataUrl: string;
  otpAuthUrl: string;
}

@Injectable()
export class SetupMfaUsecase extends Usecase<SetupMfaResult> {
  constructor(
    private readonly mfaService: MfaService,
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly staffRepository: StaffRepository,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, _params: MfaSetupDto): Promise<SetupMfaResult> {
    const mfaStaffId = this.requestContextService.getUserId();

    const staff = await this.staffRepository.findOne({ where: { id: mfaStaffId } });
    if (!staff) throw new UnauthorizedException('Staff not found');

    const { encryptedSecret, otpAuthUrl, qrCodeDataUrl } = await this.mfaService.generateSecret(
      staff.email,
    );

    // Store encrypted secret (not yet confirmed)
    await this.mfaConfigRepository.saveOrUpdate(mfaStaffId, { encryptedSecret }, em);

    return { qrCodeDataUrl, otpAuthUrl };
  }
}
