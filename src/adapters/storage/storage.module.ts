import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER_TOKEN, StorageProviderEnum } from './storage.constants';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { R2StorageProvider } from './providers/r2.provider';

@Module({
  providers: [
    LocalStorageProvider,
    S3StorageProvider,
    R2StorageProvider,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider, R2StorageProvider],
      useFactory: (
        configService: ConfigService,
        local: LocalStorageProvider,
        s3: S3StorageProvider,
        r2: R2StorageProvider,
      ) => {
        const provider = configService.get<string>(
          'storageConfig.provider',
          StorageProviderEnum.LOCAL,
        );
        switch (provider) {
          case StorageProviderEnum.S3:
            return s3;
          case StorageProviderEnum.R2:
            return r2;
          default:
            return local;
        }
      },
    },
  ],
  exports: [STORAGE_PROVIDER_TOKEN],
})
export class StorageModule {}
