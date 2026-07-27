import { INTEGRATION_USER_AGENT } from './user-agent.js';

export type FetchLike = typeof fetch;

export type FetchWithBackoffOptions = {
  fetchImpl?: FetchLike;
  /** Max attempts including the first try. */
  maxAttempts?: number;
  /** Base delay before first retry (ms). */
  baseDelayMs?: number;
  /** Injected clock for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected RNG for jitter (0..1). */
  random?: () => number;
  userAgent?: string;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * GET with User-Agent and exponential backoff + jitter on 429/5xx.
 */
export async function fetchWithBackoff(
  url: string,
  options: FetchWithBackoffOptions = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const userAgent = options.userAgent ?? INTEGRATION_USER_AGENT;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent,
        },
      });
      if (!shouldRetry(res.status) || attempt === maxAttempts) {
        return res;
      }
      const jitter = random() * baseDelayMs;
      await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) throw err;
      const jitter = random() * baseDelayMs;
      await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('fetchWithBackoff failed');
}
