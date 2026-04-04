import { Module } from '@nestjs/common';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { R2StorageProvider } from './providers/r2.provider';
import { StorageAdapter } from './storage.adapter';

@Module({
  providers: [LocalStorageProvider, S3StorageProvider, R2StorageProvider, StorageAdapter],
  exports: [StorageAdapter],
})
export class StorageModule {}
