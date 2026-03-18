import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as crypto from 'node:crypto';
import { EncryptionUtility } from '@shared/utility/encryption/encryption.utility';

export interface AccessTokenPayload {
  sub: string;
  jti: string;
  role: string;
  exp?: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryptionUtility: EncryptionUtility,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    const secret = this.configService.get<string>('common.jwt.accessSecret');
    const expiresIn = this.configService.get<number>('common.jwt.accessExpiry');
    const jwt = this.jwtService.sign(payload, { secret, expiresIn });
    return this.encryptionUtility.encrypt(jwt);
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const jwt = this.encryptionUtility.decrypt(token);
      const secret = this.configService.get<string>('common.jwt.accessSecret');
      return this.jwtService.verify<AccessTokenPayload>(jwt, { secret });
    } catch {
      return null;
    }
  }

  generateOpaqueToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  generateJti(): string {
    return crypto.randomUUID();
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = this.configService.get<string>('common.nodeEnv') === 'production';

    const cookieBase = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };

    const accessExpiry = this.configService.get<number>('common.jwt.accessExpiry')!;
    res.cookie('access_token', accessToken, {
      ...cookieBase,
      maxAge: accessExpiry * 1000,
    });

    const refreshExpiry = this.configService.get<number>('common.jwt.refreshExpiry')!;
    res.cookie('refresh_token', refreshToken, {
      ...cookieBase,
      path: '/staff/auth/refresh',
      maxAge: refreshExpiry * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { httpOnly: true, path: '/' });
    res.clearCookie('refresh_token', { httpOnly: true, path: '/staff/auth/refresh' });
  }
}
