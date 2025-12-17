import type { ActionRequest, ActionResponse, StatusResponse } from '../types';
import { DEBUG_ENABLED, debugLog } from '../utils/debug';

const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string) || '';
const STATUS_PATH: string = (import.meta.env.VITE_STATUS_PATH as string) || '/v1/status';
const ACTION_PATH: string = (import.meta.env.VITE_ACTION_PATH as string) || '/v1/action';

function buildUrl(path: string): string {
  return `${API_BASE}${path}`;
}

class ApiError extends Error {
  unauthenticated: boolean;
  statusCode?: number;
  constructor(message: string, opts?: { unauthenticated?: boolean; statusCode?: number }) {
    super(message);
    this.name = 'ApiError';
    this.unauthenticated = Boolean(opts?.unauthenticated);
    this.statusCode = opts?.statusCode;
  }
}

function isLikelyHtml(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.includes('text/html');
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    throw new ApiError('Unauthenticated (non-JSON response)', { unauthenticated: true, statusCode: res.status });
  }
  return (await res.json()) as T;
}

function makeAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener('abort', () => clearTimeout(id));
  return controller.signal;
}

// Log effective config once
if (DEBUG_ENABLED) {
  debugLog('API config', { API_BASE, STATUS_PATH, ACTION_PATH });
}

export async function getStatus(): Promise<StatusResponse> {
  const url = buildUrl(STATUS_PATH);
  const doFetch = async (): Promise<StatusResponse> => {
    const signal = makeAbortSignal(9000);
    DEBUG_ENABLED && debugLog('GET', url);
    const res = await fetch(url, { credentials: 'include', signal });
    DEBUG_ENABLED && debugLog('GET response', { url: res.url, status: res.status, redirected: res.redirected, contentType: res.headers.get('content-type') });
    if ((res.status >= 300 && res.status < 400) || res.status === 401 || res.status === 403 || isLikelyHtml(res.headers.get('content-type'))) {
      throw new ApiError('Unauthenticated', { unauthenticated: true, statusCode: res.status });
    }
    if (!res.ok) {
      throw new ApiError(`Failed to load status (${res.status})`, { statusCode: res.status });
    }
    return await parseJsonSafe<StatusResponse>(res);
  };

  try {
    return await doFetch();
  } catch (err) {
    DEBUG_ENABLED && debugLog('GET error', err);
    if (err instanceof DOMException || (err as Error)?.name === 'AbortError') {
      DEBUG_ENABLED && debugLog('GET retry after abort');
      return await doFetch();
    }
    if (err instanceof TypeError) {
      // Access redirects can surface as TypeError; treat as unauthenticated
      throw new ApiError('Unauthenticated (network/CORS)', { unauthenticated: true });
    }
    throw err;
  }
}

export async function postAction(req: ActionRequest): Promise<ActionResponse> {
  const url = buildUrl(ACTION_PATH);
  const signal = makeAbortSignal(9000);
  DEBUG_ENABLED && debugLog('POST', url, req);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req)
  });

  DEBUG_ENABLED && debugLog('POST response', { url: res.url, status: res.status, redirected: res.redirected, contentType: res.headers.get('content-type') });
  if ((res.status >= 300 && res.status < 400) || res.status === 401 || res.status === 403 || isLikelyHtml(res.headers.get('content-type'))) {
    throw new ApiError('Unauthenticated', { unauthenticated: true, statusCode: res.status });
  }
  if (!res.ok) {
    throw new ApiError(`Action failed (${res.status})`, { statusCode: res.status });
  }
  return await parseJsonSafe<ActionResponse>(res);
}

export { ApiError };


