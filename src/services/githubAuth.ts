import { GITHUB_CLIENT_ID, GITHUB_SCOPES, GITHUB_DEVICE_CODE_URL, GITHUB_TOKEN_URL } from '../config/github';
import * as db from '../db/client';

export interface DeviceCodeResponse {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  expires_in?: number;
  interval?: number;
  error?: string;
  error_description?: string;
}

export interface TokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  interval?: number;
}

async function makeHttpRequest(
  method: string,
  url: string,
  body?: string,
  token?: string
): Promise<any> {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const resText = await invoke<string>('github_http_request', {
        method,
        url,
        body,
        token,
      });
      return JSON.parse(resText);
    } catch (e) {
      console.warn('Tauri native curl request failed, falling back to fetch', e);
    }
  }

  // Browser fallback using standard fetch
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  });

  return await response.json();
}

export async function startDeviceFlow(): Promise<DeviceCodeResponse> {
  const payload = JSON.stringify({
    client_id: GITHUB_CLIENT_ID,
    scope: GITHUB_SCOPES,
  });

  try {
    const data = await makeHttpRequest('POST', GITHUB_DEVICE_CODE_URL, payload);
    return data;
  } catch (err: any) {
    console.error('Error starting device flow:', err);
    return {
      error: 'request_failed',
      error_description: err?.message || 'Failed to connect to GitHub authorization service.',
    };
  }
}

export async function pollDeviceToken(deviceCode: string): Promise<TokenResponse> {
  const payload = JSON.stringify({
    client_id: GITHUB_CLIENT_ID,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  });

  try {
    const data = await makeHttpRequest('POST', GITHUB_TOKEN_URL, payload);
    return data;
  } catch (err: any) {
    return {
      error: 'request_failed',
      error_description: err?.message || 'Failed to poll token',
    };
  }
}

export async function loadStoredToken(): Promise<string> {
  return await db.getSetting('__github_token', '');
}

export async function saveStoredToken(token: string): Promise<void> {
  await db.setSetting('__github_token', token);
}

export async function clearStoredToken(): Promise<void> {
  await db.setSetting('__github_token', '');
}
