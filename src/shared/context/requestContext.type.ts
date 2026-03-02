export interface RequestUser {
  id: number;
  publicId: string;
  email: string;
  firstname: string;
  lastname: string;
  rateLimitTier: string;
  roles: any[];
}
