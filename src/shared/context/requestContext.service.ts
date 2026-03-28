import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

const CLS_KEY_USER = 'user';
const CLS_KEY_ABORT_SIGNAL = 'abortSignal';
const CLS_KEY_IP = 'ip';
const CLS_KEY_USER_AGENT = 'userAgent';

export type TRequestUser = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: {
    id: string;
    name: string;
    alias: string;
    isActive: boolean;
    isSystemRole: boolean;
    permissions: any[];
  };
};

/**
 * Typed wrapper over ClsService for accessing the authenticated user context
 * anywhere in the call chain without threading the request object.
 *
 * ClsService is a singleton, but .get()/.set() read/write to the correct
 * per-request AsyncLocalStorage store automatically.
 */
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  setUser(user: TRequestUser): void {
    this.cls.set(CLS_KEY_USER, user);
  }

  setUserId(id: string): void {
    this.cls.set(CLS_KEY_USER, { id } as TRequestUser);
  }

  getUser(): TRequestUser | null {
    return this.cls.get(CLS_KEY_USER) ?? null;
  }

  /**
   * Returns the user's id, or 'SYSTEM' when there is no authenticated user
   * (cron jobs, migrations, system operations).
   */
  getUserId(): string {
    return this.getUser()?.id ?? 'SYSTEM';
  }

  isAuthenticated(): boolean {
    return this.getUser() !== null;
  }

  setIp(ip: string): void {
    this.cls.set(CLS_KEY_IP, ip);
  }

  getIp() {
    return this.cls.get(CLS_KEY_IP) ?? '';
  }

  setUserAgent(ua: string): void {
    this.cls.set(CLS_KEY_USER_AGENT, ua);
  }

  getUserAgent() {
    return this.cls.get(CLS_KEY_USER_AGENT) ?? '';
  }

  setAbortSignal(signal: AbortSignal): void {
    this.cls.set(CLS_KEY_ABORT_SIGNAL, signal);
  }

  getAbortSignal(): AbortSignal | null {
    return this.cls.get(CLS_KEY_ABORT_SIGNAL) ?? null;
  }

  isAborted(): boolean {
    return this.getAbortSignal()?.aborted ?? false;
  }
}
