import * as Sentry from '@sentry/nestjs';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: false,
});
