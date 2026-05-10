import type { SocialProvider } from '../../types';
import type { ApiClient } from '../ApiClient';

export interface SocialCallbackParams {
  state: string;
  code: string;
  redirect_uri?: string;
}

export interface SocialCallbackResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: {
    id: string;
    email: string;
    public_id: string;
    icon_url: string | null;
  };
}

export function buildConnectURL(
  baseURL: string,
  provider: SocialProvider,
  redirectURI: string,
): string {
  const base = baseURL.replaceAll(/\/+$/g, '');
  return `${base}/v1/auth/connect/${encodeURIComponent(provider)}?redirect_uri=${encodeURIComponent(redirectURI)}`;
}

export function socialCallback(
  api: ApiClient,
  provider: SocialProvider,
  params: SocialCallbackParams,
): Promise<SocialCallbackResponse> {
  const query = new URLSearchParams({
    state: params.state,
    code: params.code,
  });
  if (params.redirect_uri !== undefined) {
    query.set('redirect_uri', params.redirect_uri);
  }
  return api.request<SocialCallbackResponse>(
    `/v1/auth/callback/${encodeURIComponent(provider)}?${query.toString()}`,
    { method: 'GET' },
  );
}

export function disconnectSocial(api: ApiClient, provider: SocialProvider): Promise<void> {
  return api.request<void>(`/v1/auth/disconnect/${encodeURIComponent(provider)}`, {
    method: 'POST',
  });
}
