import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import {
  IEmailProvider,
  SendInviteEmailParams,
  SendPasswordResetEmailParams,
} from '@adapters/email/email.interface';

@Injectable()
export class SendGridEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(SendGridEmailProvider.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('common.email.sendgrid.apiKey')!;
    sgMail.setApiKey(apiKey);
  }

  async sendInviteEmail({ to, inviteLink }: SendInviteEmailParams): Promise<void> {
    const from = this.configService.get<string>('common.email.sendgrid.from')!;
    const templateId = this.configService.get<string>('common.email.sendgrid.templateInvite')!;

    await sgMail.send({
      to,
      from,
      templateId,
      dynamicTemplateData: { inviteLink },
    });

    this.logger.log(`Invite email sent to ${to}`);
  }

  async sendPasswordResetEmail({ to, resetLink }: SendPasswordResetEmailParams): Promise<void> {
    const from = this.configService.get<string>('common.email.sendgrid.from')!;
    const templateId = this.configService.get<string>(
      'common.email.sendgrid.templatePasswordReset',
    )!;

    await sgMail.send({
      to,
      from,
      templateId,
      dynamicTemplateData: { resetLink },
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }
}
