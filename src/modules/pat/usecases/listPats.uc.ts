import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PersonalAccessTokenRepository } from '@adapters/repositories/personalAccessToken.repository';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface PatSummary {
  id: string;
  name: string;
  expiresAt: Date | null;
  isRevoked: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface ListPatsResult {
  pats: PatSummary[];
}

@Injectable()
export class ListPatsUsecase extends Usecase<ListPatsResult> {
  readonly config = { requiresTransaction: false };

  constructor(
    private readonly patRepository: PersonalAccessTokenRepository,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(_em: EntityManager, _params: Record<string, unknown>): Promise<ListPatsResult> {
    const staffId = this.requestContextService.getUserId();
    const tokens = await this.patRepository.findAllForStaff(staffId);

    const pats: PatSummary[] = tokens.map((t) => ({
      id: t.id,
      name: t.name,
      expiresAt: t.expiresAt,
      isRevoked: t.isRevoked,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
    }));

    return { pats };
  }
}
