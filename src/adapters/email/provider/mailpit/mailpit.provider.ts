import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as Handlebars from 'handlebars';
import {
  IEmailProvider,
  SendInviteEmailParams,
  SendPasswordResetEmailParams,
} from '@adapters/email/email.interface';

@Injectable()
export class MailpitEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(MailpitEmailProvider.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('common.email.mailpit.host'),
      port: this.configService.get<number>('common.email.mailpit.port'),
      secure: false,
    });
  }

  private renderTemplate(templateName: string, data: Record<string, string>): string {
    const templatePath = path.join(__dirname, '../../templates', `${templateName}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(source);
    return template(data);
  }

  async sendInviteEmail({ to, inviteLink }: SendInviteEmailParams): Promise<void> {
    const from = this.configService.get<string>('common.email.from');
    const html = this.renderTemplate('invite', { inviteLink });

    await this.transporter.sendMail({
      from,
      to,
      subject: 'You have been invited to Deyon HMS',
      html,
    });

    this.logger.log(`Invite email sent to ${to}`);
  }

  async sendPasswordResetEmail({ to, resetLink }: SendPasswordResetEmailParams): Promise<void> {
    const from = this.configService.get<string>('common.email.from');
    const html = this.renderTemplate('password-reset', { resetLink });

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Reset your Deyon HMS password',
      html,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }
}
