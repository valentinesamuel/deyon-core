export type TStorageUploadOptions = { contentType?: string; metadata?: Record<string, string> };
export type TStorageUploadResult = { key: string; url: string };
export type TStorageMetadata = {
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, string>;
};

export interface StorageInterface {
  upload(
    file: Buffer,
    path: string,
    options?: TStorageUploadOptions,
  ): Promise<TStorageUploadResult>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  exists(path: string): Promise<boolean>;
  copy(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult>;
  move(sourcePath: string, destinationPath: string): Promise<TStorageUploadResult>;
  getMetadata(path: string): Promise<TStorageMetadata>;
}
