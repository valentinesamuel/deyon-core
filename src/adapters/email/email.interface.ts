export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER';

export interface SendInviteEmailParams {
  to: string;
  inviteLink: string;
}

export interface SendPasswordResetEmailParams {
  to: string;
  resetLink: string;
}

export interface IEmailProvider {
  sendInviteEmail(params: SendInviteEmailParams): Promise<void>;
  sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void>;
}
