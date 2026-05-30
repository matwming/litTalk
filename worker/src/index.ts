/**
 * Lit Talk OAuth proxy — exchanges a GitHub OAuth `code` for an `access_token`
 * so the browser never sees the OAuth Client Secret.
 *
 * Request:  POST /   Content-Type: application/json
 *           Body:    { code: string, client_id: string }
 *
 * Response: 200      { access_token: string, token_type: string, scope: string }
 *           4xx/5xx  { error: string }
 *
 * Configure secrets/vars in wrangler.jsonc + .dev.vars (see README.md).
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string; // comma-separated list, e.g. "https://your-site.com,http://localhost:8000"
}

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);

    try {
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: cors});
    }

    if (request.method !== 'POST') {
      return json({error: 'Method not allowed'}, 405, cors);
    }

    // Reject cross-origin requests from origins not on the allowlist.
    if (origin && !cors['Access-Control-Allow-Origin']) {
      return json({error: 'Origin not allowed'}, 403, cors);
    }

    let body: {code?: unknown; client_id?: unknown};
    try {
      body = await request.json();
    } catch {
      return json({error: 'Invalid JSON body'}, 400, cors);
    }

    const code = typeof body.code === 'string' ? body.code : '';
    const clientId =
      typeof body.client_id === 'string' ? body.client_id : '';

    if (!code || !clientId) {
      return json({error: 'Missing code or client_id'}, 400, cors);
    }

    // This Worker holds the secret for exactly one OAuth App. Reject any
    // request that tries to exchange a code for a different App.
    if (clientId !== env.GITHUB_CLIENT_ID) {
      return json({error: 'Unknown client_id'}, 403, cors);
    }

    let ghResponse: Response;
    try {
      ghResponse = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'lit-talk-proxy',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
    } catch (e) {
      // Network/TLS failure reaching GitHub. Return a CORS-headed error so the
      // browser sees a clear message instead of an opaque CORS failure.
      return json(
        {error: `Failed to reach GitHub: ${(e as Error).message}`},
        502,
        cors
      );
    }

    let payload: {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    try {
      payload = await ghResponse.json();
    } catch {
      return json(
        {error: 'GitHub returned a non-JSON response'},
        502,
        cors
      );
    }

    if (!ghResponse.ok || !payload.access_token) {
      // Surface GitHub's error code (e.g. "bad_verification_code") without
      // leaking the rest of the payload.
      return json(
        {error: payload.error || 'OAuth exchange failed'},
        ghResponse.ok ? 502 : ghResponse.status,
        cors
      );
    }

    return json(
      {
        access_token: payload.access_token,
        token_type: payload.token_type,
        scope: payload.scope,
      },
      200,
      cors
    );
    } catch (e) {
      // Log the real error server-side (inspect with `wrangler tail`); return a
      // generic, CORS-headed message so stack traces never leak to clients.
      console.error('[lit-talk-worker] uncaught error:', e);
      return json({error: 'Internal error'}, 500, cors);
    }
  },
};

function corsHeaders(
  origin: string | null,
  env: Env
): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(
  data: unknown,
  status: number,
  cors: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...cors,
    },
  });
}
