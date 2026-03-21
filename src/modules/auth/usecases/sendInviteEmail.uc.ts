import { Usecase } from '@broker/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider, EMAIL_PROVIDER_TOKEN } from '@adapters/email/email.interface';

export interface SendInviteEmailResult {
  emailSent: boolean;
}

@Injectable()
export class SendInviteEmailUsecase extends Usecase<SendInviteEmailResult> {
  private readonly logger = new Logger(SendInviteEmailUsecase.name);
  readonly config = { requiresTransaction: false };

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: IEmailProvider,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async execute(
    entityManager: EntityManager,
    params: { inviteToken: string; email: string },
  ): Promise<SendInviteEmailResult> {
    const { inviteToken, email } = params;

    const frontendUrl = this.configService.get<string>('common.frontendUrl');
    const inviteLink = `${frontendUrl}/invite/accept?token=${inviteToken}`;

    try {
      await this.emailProvider.sendInviteEmail({ to: email, inviteLink });
      return { emailSent: true };
    } catch (err) {
      this.logger.error(
        'Failed to send invite email',
        err instanceof Error ? err.message : String(err),
      );
      return { emailSent: false };
    }
  }
}
