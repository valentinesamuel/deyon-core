import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Claim, ClaimStatusEnum } from '@modules/core/entities/claim.entity';
import { StorageAdapter } from '@adapters/storage/storage.adapter';

type UploadedFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

type TParams = { id: string; file: UploadedFile };
type TResult = { claim: Claim };

@Injectable()
export class UploadClaimDocumentUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
    private readonly storageAdapter: StorageAdapter,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.claimsService.getClaimOrFail({ where: { id: params.id } }, em);

    if (existing.status === ClaimStatusEnum.PAID || existing.status === ClaimStatusEnum.RETRACTED) {
      throw new BadRequestException('Cannot upload documents for a paid or retracted claim.');
    }

    if (!ALLOWED_MIME_TYPES.has(params.file.mimetype)) {
      throw new BadRequestException('Only PDF, JPEG, and PNG files are allowed.');
    }

    if (params.file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size must not exceed 10MB.');
    }

    const staffId = this.requestContextService.getUserId();
    const filename = `${Date.now()}-${params.file.originalname.replaceAll(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `claims/${params.id}/docs/${filename}`;

    const uploadResult = await this.storageAdapter.upload(params.file.buffer, filePath, {
      contentType: params.file.mimetype,
    });

    const existingAttachments = existing.attachments ?? [];
    const newAttachment = {
      key: uploadResult.key,
      url: uploadResult.url,
      filename: params.file.originalname,
      uploadedBy: staffId,
      uploadedAt: new Date().toISOString(),
    };

    const claim = await this.claimsService.updateClaim(
      { id: params.id },
      { attachments: [...existingAttachments, newAttachment] },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.CLAIM_DOCUMENT_UPLOADED,
        module: EventModule.CLAIM,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { claimId: params.id, filename: params.file.originalname },
      },
      em,
    );

    return { claim };
  }
}
