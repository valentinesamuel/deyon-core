import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider, StorageUploadOptions, StorageUploadResult } from '../istorage.interface';

@Injectable()
export class R2StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly accountId: string;

  constructor(private readonly configService: ConfigService) {
    this.accountId = this.configService.get<string>('storageConfig.r2.accountId', '');
    this.bucket = this.configService.get<string>('storageConfig.r2.bucket', '');

    // Cloudflare R2 is S3-compatible; endpoint format: https://<accountId>.r2.cloudflarestorage.com
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('storageConfig.r2.accessKeyId', ''),
        secretAccessKey: this.configService.get<string>('storageConfig.r2.secretAccessKey', ''),
      },
    });
  }

  async upload(
    file: Buffer,
    filePath: string,
    options?: StorageUploadOptions,
  ): Promise<StorageUploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
        Body: file,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      }),
    );
    const url = `https://pub-${this.accountId}.r2.dev/${filePath}`;
    this.logger.debug(`Uploaded to R2: ${filePath}`);
    return { key: filePath, url };
  }

  async delete(filePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: filePath }));
  }

  async getSignedUrl(filePath: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: filePath }), {
      expiresIn: expiresInSeconds,
    });
  }
}
