import type { ApiClient } from '../ApiClient';

export interface RegisterRequest {
  email: string;
  password: string;
  public_id: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  public_id: string;
  mfa_enabled: boolean;
  icon_url: string | null;
  created_at: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponseOK {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  mfa_required?: false;
}

export interface LoginResponseMFA {
  pre_token: string;
  mfa_required: true;
  token_type: 'Bearer';
  expires_in: number;
}

export type LoginResponse = LoginResponseOK | LoginResponseMFA;

export interface RefreshResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export function register(api: ApiClient, req: RegisterRequest): Promise<RegisterResponse> {
  return api.request<RegisterResponse>('/v1/auth/register', {
    method: 'POST',
    json: req,
  });
}

export function login(api: ApiClient, req: LoginRequest): Promise<LoginResponse> {
  return api.request<LoginResponse>('/v1/auth/login', {
    method: 'POST',
    json: req,
  });
}

export function refresh(api: ApiClient): Promise<RefreshResponse> {
  return api.request<RefreshResponse>('/v1/auth/refresh', {
    method: 'POST',
  });
}

export function logout(api: ApiClient): Promise<void> {
  return api.request<void>('/v1/auth/logout', {
    method: 'POST',
  });
}
