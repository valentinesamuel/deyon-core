import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TokenService } from '@modules/auth/services/token.service';
import { PersonalAccessTokenRepository } from '@adapters/repositories/personalAccessToken.repository';
import { RequestContextService } from '@shared/context/requestContext.service';
import { CreatePatDto } from '../dto/createPat.dto';

export interface GeneratePatResult {
  pat: string;
  id: string;
  name: string;
  expiresAt: Date | null;
}

@Injectable()
export class GeneratePatUsecase extends Usecase<GeneratePatResult> {
  readonly config = { requiresTransaction: false };

  constructor(
    private readonly tokenService: TokenService,
    private readonly patRepository: PersonalAccessTokenRepository,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(_em: EntityManager, params: CreatePatDto): Promise<GeneratePatResult> {
    const staffId = this.requestContextService.getUserId();

    const rawToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.sha256(rawToken);

    const expiresAt = params.expiresAt ? new Date(params.expiresAt) : null;

    const saved = await this.patRepository.createToken({
      tokenHash,
      staffId,
      name: params.name,
      expiresAt,
      isRevoked: false,
    });

    return {
      pat: rawToken,
      id: saved.id,
      name: saved.name,
      expiresAt: saved.expiresAt,
    };
  }
}
