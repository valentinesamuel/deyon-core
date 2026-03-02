import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RequestUser } from './requestContext.type';

const CLS_KEY_USER = 'user';
const CLS_KEY_ABORT_SIGNAL = 'abortSignal';

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

  setUser(user: RequestUser): void {
    this.cls.set(CLS_KEY_USER, user);
  }

  getUser(): RequestUser | null {
    return this.cls.get(CLS_KEY_USER) ?? null;
  }

  /**
   * Returns the user's publicId, or 'SYSTEM' when there is no authenticated user
   * (cron jobs, migrations, system operations).
   */
  getUserId(): string {
    return this.getUser()?.publicId ?? 'SYSTEM';
  }

  isAuthenticated(): boolean {
    return this.getUser() !== null;
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
