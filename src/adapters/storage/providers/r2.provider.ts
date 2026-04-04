import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  TStorageUploadOptions,
  TStorageUploadResult,
  TStorageMetadata,
  StorageInterface,
} from '../storage.interface';

@Injectable()
export class R2StorageProvider implements StorageInterface {
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
    options?: TStorageUploadOptions,
  ): Promise<TStorageUploadResult> {
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

  async exists(filePath: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: filePath }));
      return true;
    } catch {
      return false;
    }
  }

  async copy(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourcePath}`,
        Key: destinationPath,
      }),
    );
    const url = `https://pub-${this.accountId}.r2.dev/${destinationPath}`;
    return { key: destinationPath, url };
  }

  async move(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult> {
    const result = await this.copy(sourcePath, destinationPath);
    await this.delete(sourcePath);
    return result;
  }

  async getMetadata(filePath: string): Promise<TStorageMetadata> {
    const response = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: filePath }),
    );
    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? 'application/octet-stream',
      lastModified: response.LastModified ?? new Date(),
      metadata: response.Metadata,
    };
  }
}
