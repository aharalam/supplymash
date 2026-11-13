/**
 * Minimal IBM watsonx.ai Granite chat client (spec §4: three narrow jobs).
 *
 * Uses the REST API with Node's built-in fetch:
 *   IAM token: POST https://iam.cloud.ibm.com/identity/token  (API key grant)
 *   Chat:      POST {WATSONX_URL}/ml/v1/text/chat?version=...
 *
 * Every call has a hard timeout and returns null on ANY failure, so callers
 * always have a deterministic fallback (spec §13). Nothing here throws.
 */

const IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const API_VERSION = '2024-10-08';
const DEFAULT_MODEL = 'ibm/granite-4-h-small'; // the Granite chat model offered in Dallas (us-south)
// Granite normally answers in 1–1.5 s. On a bad network, waiting longer only stalls the demo.
export const GRANITE_TIMEOUT_MS = 5000;
// After a failure, skip Granite for a while so every later call falls back instantly
// instead of each waiting out its own timeout (a lumber order makes three calls).
const SKIP_AFTER_FAILURE_MS = 60_000;

let cachedToken: { value: string; expiresAt: number } | null = null;
let skipUntil = 0;

function config() {
  return {
    apiKey: process.env.WATSONX_API_KEY ?? '',
    projectId: process.env.WATSONX_PROJECT_ID ?? '',
    url: (process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com').replace(/\/$/, ''),
    model: process.env.WATSONX_MODEL_ID || DEFAULT_MODEL,
  };
}

export function graniteConfigured(): boolean {
  const c = config();
  return Boolean(c.apiKey && c.projectId);
}

/** Test hook: forget the cached IAM token and any recent failure. */
export function resetGraniteToken(): void {
  cachedToken = null;
  skipUntil = 0;
}

async function iamToken(apiKey: string, signal: AbortSignal): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(IAM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'urn:ibm:params:oauth:grant-type:apikey', apikey: apiKey }),
    signal,
  });
  if (!res.ok) throw new Error(`IAM token HTTP ${res.status}`);
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('IAM token missing access_token');
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

/** One chat completion. Returns the assistant text, or null on any failure/timeout. */
export async function graniteChat(
  system: string,
  user: string,
  { maxTokens = 400, timeoutMs = GRANITE_TIMEOUT_MS }: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const c = config();
  if (!c.apiKey || !c.projectId) return null;
  if (Date.now() < skipUntil) return null;
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const token = await iamToken(c.apiKey, signal);
    const res = await fetch(`${c.url}/ml/v1/text/chat?version=${API_VERSION}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model_id: c.model,
        project_id: c.projectId,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0,
      }),
      signal,
    });
    if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('empty completion');
    return text;
  } catch (err) {
    skipUntil = Date.now() + SKIP_AFTER_FAILURE_MS;
    console.warn(`[granite] falling back for the next ${SKIP_AFTER_FAILURE_MS / 1000}s: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Chat and parse the first JSON value in the reply (models often wrap JSON in
 * prose or ``` fences). Returns null if there is no parseable JSON.
 */
export async function graniteJSON(system: string, user: string, opts?: { maxTokens?: number; timeoutMs?: number }): Promise<unknown | null> {
  const text = await graniteChat(system, user, opts);
  if (text === null) return null;
  const start = text.search(/[[{]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === '[' ? ']' : '}';
  const end = text.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    console.warn('[granite] reply was not valid JSON; falling back');
    return null;
  }
}
