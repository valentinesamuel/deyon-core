import { registerAs } from '@nestjs/config';

export default registerAs('storageConfig', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'local',
  local: {
    uploadDir: process.env.LOCAL_UPLOAD_DIR ?? './uploads',
    baseUrl: process.env.LOCAL_STORAGE_BASE_URL ?? 'http://localhost:3000/uploads',
  },
  s3: {
    region: process.env.AWS_S3_REGION ?? 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET ?? '',
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? '',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
}));
