import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER_TOKEN } from './email.interface';
import { SendGridEmailProvider } from './provider/sendgrid/sendgrid.provider';
import { MailpitEmailProvider } from './provider/mailpit/mailpit.provider';

@Module({
  providers: [
    SendGridEmailProvider,
    MailpitEmailProvider,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      inject: [ConfigService, SendGridEmailProvider, MailpitEmailProvider],
      useFactory: (
        configService: ConfigService,
        sendgrid: SendGridEmailProvider,
        mailpit: MailpitEmailProvider,
      ) => {
        const provider = configService.get<string>('common.email.provider');
        return provider === 'sendgrid' ? sendgrid : mailpit;
      },
    },
  ],
  exports: [EMAIL_PROVIDER_TOKEN],
})
export class EmailModule {}
