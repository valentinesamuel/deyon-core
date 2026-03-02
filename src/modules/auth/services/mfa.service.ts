import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import * as QRCode from 'qrcode';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { EncryptionUtility } from '@shared/utility/encryption/encryption.utility';

export interface MfaSecretResult {
  encryptedSecret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface BackupCodesResult {
  plainCodes: string[];
  hashedCodes: string[];
}

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly totp: TOTP;

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionUtility: EncryptionUtility,
  ) {
    this.totp = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
    });
  }

  async generateSecret(email: string): Promise<MfaSecretResult> {
    const issuer = this.configService.get<string>('common.mfa.issuer');
    const secret = this.totp.generateSecret();
    const otpauthUrl = this.totp.toURI({ label: email, issuer, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const encryptedSecret = this.encryptionUtility.encrypt(secret);

    return { encryptedSecret, otpauthUrl, qrCodeDataUrl };
  }

  async verifyTotp(encryptedSecret: string, code: string): Promise<boolean> {
    try {
      const secret = this.encryptionUtility.decrypt(encryptedSecret);
      const result = await this.totp.verify(code, { secret });
      return result.valid;
    } catch {
      return false;
    }
  }

  async generateBackupCodes(): Promise<BackupCodesResult> {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      plainCodes.push(code);
      const hash = await argon2.hash(code, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
      hashedCodes.push(hash);
    }

    return { plainCodes, hashedCodes };
  }

  async verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const matches = await argon2.verify(hashedCodes[i], code);
      if (matches) return i;
    }
    return -1;
  }
}
