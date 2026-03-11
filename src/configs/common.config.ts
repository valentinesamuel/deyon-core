import { registerAs } from '@nestjs/config';

// const NODE_ENVIRONMENTS = ['development', 'staging', 'beta', 'production'];

export default registerAs('common', () => ({
  port: process.env.APP_PORT || 3000,
  appName: process.env.APP_NAME,
  appHostName: process.env.APP_HOSTNAME,
  nodeEnv: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  swaggerApiRoot: process.env.SWAGGER_API_ROOT,
  frontendUrl: process.env.FRONTEND_URL,

  auth: {
    authName: process.env.APP_AUTH_NAME,
    appKey: process.env.APP_KEY,
    serviceAccessName: process.env.SERVICE_ACCESS_NAME,
  },

  metrics: {
    healthName: process.env.HEALTH_NAME,
    healthKey: process.env.HEALTH_KEY,
  },

  debug: {
    debuggerName: process.env.DEBUGGER_NAME,
    debuggerKey: process.env.DEBUGGER_KEY,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiry: Number.parseInt(process.env.JWT_ACCESS_EXPIRY ?? '900', 10),
    refreshExpiry: Number.parseInt(process.env.JWT_REFRESH_EXPIRY ?? '604800', 10),
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  mfa: {
    issuer: process.env.MFA_ISSUER ?? 'DeyonHMS',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER ?? 'mailpit',
    from: process.env.SMTP_FROM ?? 'Deyon HMS <noreply@deyon.com>',
    mailpit: {
      host: process.env.MAILPIT_HOST ?? 'localhost',
      port: Number.parseInt(process.env.MAILPIT_PORT ?? '1025', 10),
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.SENDGRID_FROM,
      templateInvite: process.env.SENDGRID_TEMPLATE_INVITE,
      templatePasswordReset: process.env.SENDGRID_TEMPLATE_PASSWORD_RESET,
    },
  },

  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM ?? 'aes-256-gcm',
    key: process.env.TOKEN_ENCRYPTION_KEY,
  },
}));
