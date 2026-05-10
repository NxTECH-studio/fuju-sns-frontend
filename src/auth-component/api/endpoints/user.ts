import type { SocialProvider } from '../../types';
import type { ApiClient } from '../ApiClient';

export interface UserProfileResponse {
  id: string;
  email: string;
  public_id: string;
  display_name?: string;
  mfa_enabled: boolean;
  mfa_verified?: boolean;
  icon_url: string | null;
  linked_providers?: SocialProvider[];
  created_at: string;
}

export interface UpdatePublicIdRequest {
  public_id: string;
}

export function getProfile(api: ApiClient): Promise<UserProfileResponse> {
  return api.request<UserProfileResponse>('/v1/user/profile', { method: 'GET' });
}

export function updatePublicId(
  api: ApiClient,
  req: UpdatePublicIdRequest,
): Promise<{ id: string; public_id: string }> {
  return api.request('/v1/user/public_id', {
    method: 'PATCH',
    json: req,
  });
}

export function updateIcon(api: ApiClient, file: File): Promise<{ id: string; icon_url: string }> {
  const form = new FormData();
  form.append('image', file);
  return api.request('/v1/user/icon', {
    method: 'PUT',
    body: form,
  });
}
