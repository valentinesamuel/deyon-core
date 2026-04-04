import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageProvider, StorageUploadOptions, StorageUploadResult } from '../istorage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('storageConfig.local.uploadDir', './uploads');
    this.baseUrl = this.configService.get<string>(
      'storageConfig.local.baseUrl',
      'http://localhost:3000/uploads',
    );
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async upload(
    file: Buffer,
    filePath: string,
    _options?: StorageUploadOptions,
  ): Promise<StorageUploadResult> {
    const fullPath = path.join(this.uploadDir, filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, file);
    this.logger.debug(`Saved file locally: ${fullPath}`);
    return { key: filePath, url: `${this.baseUrl}/${filePath}` };
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getSignedUrl(filePath: string, _expiresInSeconds: number): Promise<string> {
    return `${this.baseUrl}/${filePath}`;
  }
}
