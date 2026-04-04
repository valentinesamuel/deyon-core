import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { EnterLabResultDto } from '../dto/enterLabResult.dto';
import { LabOrderService } from '../service/labOrder.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { LabOrderResult } from '@modules/core/entities/labOrderResult.entity';
import { LabOrderStatusEnum } from '@modules/core/entities/labOrder.enums';
import { STORAGE_PROVIDER_TOKEN } from '@adapters/storage/storage.constants';
import { IStorageProvider } from '@adapters/storage/istorage.interface';

type UploadedFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

type TParams = { id: string; file?: UploadedFile } & EnterLabResultDto;
type TResult = { result: LabOrderResult };

@Injectable()
export class EnterLabResultUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly labOrderService: LabOrderService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storageProvider: IStorageProvider,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const labOrder = await this.labOrderService.getLabOrderOrFail({ where: { id: params.id } }, em);

    if (labOrder.status !== LabOrderStatusEnum.PROCESSING) {
      throw new BadRequestException(
        `Cannot enter results for lab order in status '${labOrder.status}'. Order must be in processing state.`,
      );
    }

    const item = await this.labOrderService.getLabOrderItemOrFail(
      { where: { id: params.labOrderItemId, labOrderId: params.id } },
      em,
    );

    let fileMetadata: Record<string, unknown> | undefined;
    if (params.file) {
      const ext = params.file.originalname.split('.').pop();
      const filePath = `lab-results/${params.id}/${item.id}.${ext}`;
      const uploadResult = await this.storageProvider.upload(params.file.buffer, filePath, {
        contentType: params.file.mimetype,
      });
      fileMetadata = { file: { key: uploadResult.key, url: uploadResult.url } };
    }

    const result = await this.labOrderService.createLabResult(
      {
        labOrderItemId: params.labOrderItemId,
        value: params.value,
        notes: params.notes,
        metadata: fileMetadata,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.LAB_RESULT_ENTERED,
        module: EventModule.LAB_ORDER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { labOrderId: params.id, resultId: result.id },
      },
      em,
    );

    return { result };
  }
}
