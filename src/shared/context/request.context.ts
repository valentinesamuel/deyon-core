import { Injectable, Scope } from '@nestjs/common';

export interface Role {
  name: string;
  alias: string;
}

export enum StatusType {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  INVITED = 'invited',
  DECLINED = 'declined',
}

export type UserSessionType = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  phoneNumber?: string;
  role?: Role;
};

@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  private user: UserSessionType;

  setUser(user: UserSessionType) {
    this.user = user;
  }

  getUser(): UserSessionType {
    return this.user;
  }
}
