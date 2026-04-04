export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  key: string;
  url: string;
}

export interface IStorageProvider {
  upload(file: Buffer, path: string, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
