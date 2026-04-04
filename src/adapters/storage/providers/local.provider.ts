import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  TStorageUploadOptions,
  TStorageUploadResult,
  TStorageMetadata,
  StorageInterface,
} from '../storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageInterface {
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
    _options?: TStorageUploadOptions,
  ): Promise<TStorageUploadResult> {
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

  async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(path.join(this.uploadDir, filePath));
  }

  async copy(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult> {
    const srcFull = path.join(this.uploadDir, sourcePath);
    const destFull = path.join(this.uploadDir, destinationPath);
    fs.mkdirSync(path.dirname(destFull), { recursive: true });
    fs.copyFileSync(srcFull, destFull);
    return { key: destinationPath, url: `${this.baseUrl}/${destinationPath}` };
  }

  async move(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult> {
    const srcFull = path.join(this.uploadDir, sourcePath);
    const destFull = path.join(this.uploadDir, destinationPath);
    fs.mkdirSync(path.dirname(destFull), { recursive: true });
    fs.renameSync(srcFull, destFull);
    return { key: destinationPath, url: `${this.baseUrl}/${destinationPath}` };
  }

  async getMetadata(filePath: string): Promise<TStorageMetadata> {
    const fullPath = path.join(this.uploadDir, filePath);
    const stat = fs.statSync(fullPath);
    return {
      size: stat.size,
      contentType: 'application/octet-stream',
      lastModified: stat.mtime,
    };
  }
}
