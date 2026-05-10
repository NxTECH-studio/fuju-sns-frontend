import type { ApiClient } from '../ApiClient';

export interface MFARegisterResponse {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

export interface MFAEnableRequest {
  code: string;
}

export interface MFADisableRequest {
  code: string;
}

export interface MFAVerifyRequest {
  code?: string;
  recovery_code?: string;
}

export interface MFAVerifyResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export function registerMFA(api: ApiClient): Promise<MFARegisterResponse> {
  return api.request<MFARegisterResponse>('/v1/auth/mfa/register', {
    method: 'POST',
  });
}

export function enableMFA(api: ApiClient, req: MFAEnableRequest): Promise<void> {
  return api.request<void>('/v1/auth/mfa/enable', {
    method: 'POST',
    json: req,
  });
}

export function disableMFA(api: ApiClient, req: MFADisableRequest): Promise<void> {
  return api.request<void>('/v1/auth/mfa/disable', {
    method: 'POST',
    json: req,
  });
}

export function verifyMFA(
  api: ApiClient,
  preToken: string,
  req: MFAVerifyRequest,
): Promise<MFAVerifyResponse> {
  return api.request<MFAVerifyResponse>('/v1/auth/mfa/verify', {
    method: 'POST',
    json: req,
    headers: {
      Authorization: `Bearer ${preToken}`,
    },
  });
}
