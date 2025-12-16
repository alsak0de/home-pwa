import type { ActionRequest, ActionResponse, StatusResponse } from '../types';

const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string) || '';

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
    // Cloudflare Access login page would be HTML; treat as unauthenticated
    throw new ApiError('Unauthenticated (non-JSON response)', { unauthenticated: true, statusCode: res.status });
  }
  return (await res.json()) as T;
}

function makeAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  // Ensure timer is cleared when signal aborts for any reason
  controller.signal.addEventListener('abort', () => clearTimeout(id));
  return controller.signal;
}

export async function getStatus(): Promise<StatusResponse> {
  const url = buildUrl('/v1/status');
  const doFetch = async (): Promise<StatusResponse> => {
    const signal = makeAbortSignal(9000);
    const res = await fetch(url, { credentials: 'include', signal });
    if (res.status === 401 || res.status === 403 || isLikelyHtml(res.headers.get('content-type'))) {
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
    // Retry once on network failure only
    if (err instanceof DOMException || (err as Error)?.name === 'AbortError') {
      return await doFetch();
    }
    if (err instanceof TypeError) {
      // Fetch network error
      return await doFetch();
    }
    throw err;
  }
}

export async function postAction(req: ActionRequest): Promise<ActionResponse> {
  const url = buildUrl('/v1/action');
  const signal = makeAbortSignal(9000);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (res.status === 401 || res.status === 403 || isLikelyHtml(res.headers.get('content-type'))) {
    throw new ApiError('Unauthenticated', { unauthenticated: true, statusCode: res.status });
  }
  if (!res.ok) {
    throw new ApiError(`Action failed (${res.status})`, { statusCode: res.status });
  }
  return await parseJsonSafe<ActionResponse>(res);
}

export { ApiError };
