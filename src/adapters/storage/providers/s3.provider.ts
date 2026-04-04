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
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('storageConfig.s3.bucket', '');
    this.client = new S3Client({
      region: this.configService.get<string>('storageConfig.s3.region', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('storageConfig.s3.accessKeyId', ''),
        secretAccessKey: this.configService.get<string>('storageConfig.s3.secretAccessKey', ''),
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
    const url = `https://${this.bucket}.s3.amazonaws.com/${filePath}`;
    this.logger.debug(`Uploaded to S3: ${filePath}`);
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
