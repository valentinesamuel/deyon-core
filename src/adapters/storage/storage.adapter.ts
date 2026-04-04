import { Injectable, Logger } from '@nestjs/common';

import { StorageProviderEnum } from './storage.constants';
import {
  StorageInterface,
  TStorageMetadata,
  TStorageUploadOptions,
  TStorageUploadResult,
} from './storage.interface';
import { S3StorageProvider } from './providers/s3.provider';
import { R2StorageProvider } from './providers/r2.provider';

@Injectable()
export class StorageAdapter implements StorageInterface {
  private readonly logger = new Logger(StorageAdapter.name);
  private storageProvider: StorageInterface;
  constructor(
    private readonly s3Provider: S3StorageProvider,
    private readonly r2Provider: R2StorageProvider,
  ) {}

  upload(
    file: Buffer,
    path: string,
    options?: TStorageUploadOptions,
  ): Promise<TStorageUploadResult> {
    return this.storageProvider.upload(file, path, options);
  }

  delete(path: string): Promise<void> {
    return this.storageProvider.delete(path);
  }

  getSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    return this.storageProvider.getSignedUrl(path, expiresInSeconds);
  }

  exists(path: string): Promise<boolean> {
    return this.storageProvider.exists(path);
  }

  copy(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult> {
    return this.storageProvider.copy(sourcePath, destinationPath);
  }

  move(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult> {
    return this.storageProvider.move(sourcePath, destinationPath);
  }

  getMetadata(path: string): Promise<TStorageMetadata> {
    return this.storageProvider.getMetadata(path);
  }

  private initializeProvider(provider: StorageProviderEnum): void {
    switch (provider) {
      case StorageProviderEnum.S3:
        this.storageProvider = this.s3Provider;
        this.logger.log('✅ Initialized S3 storage provider');
        break;
      case StorageProviderEnum.R2:
        this.storageProvider = this.r2Provider;
        this.logger.log('✅ Initialized R2 storage provider');
        break;
      default:
        this.logger.warn(
          `⚠️ Unknown storage provider '${provider}', falling back to Local provider`,
        );
        break;
    }
  }
}
