# Lit Talk OAuth proxy (Cloudflare Worker)

A tiny stateless Worker that exchanges a GitHub OAuth `code` for an
`access_token` on behalf of `<lit-talk>`. Your Client Secret stays here, on
the edge — it never touches the browser.

This Worker is scoped to **one GitHub OAuth App**. To make Lit Talk work on
another site with a different OAuth App, deploy another copy of this Worker.

---

## 1. Create a GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**.

- **Authorization callback URL**: the page that hosts `<lit-talk>` (e.g.
  `https://your-site.example.com/`).

After creation, copy the **Client ID** and **Client Secret**.

## 2. Configure the Worker

Edit `wrangler.jsonc`:

```jsonc
"vars": {
  "GITHUB_CLIENT_ID": "Iv1.xxxxxxxxxxxxxxxx",
  "ALLOWED_ORIGINS": "https://your-site.example.com,http://localhost:8000"
}
```

Set the secret (one-time, prompts you to paste):

```bash
pnpm install
pnpm wrangler secret put GITHUB_CLIENT_SECRET
```

## 3. Run locally

```bash
cp .dev.vars.example .dev.vars     # paste your Client Secret here
pnpm dev                            # http://localhost:8787
```

Point `<lit-talk>`'s `proxy` option at `http://localhost:8787` while developing.

## 4. Deploy

```bash
pnpm deploy
```

Wrangler will print the public URL — use that as the `proxy` value in
`github-oauth-options`.

---

## Contract

`<lit-talk>` calls this Worker with:

```http
POST /
Content-Type: application/json
Origin: https://your-site.example.com

{ "code": "<github-oauth-code>", "client_id": "Iv1.xxxxxxxxxxxxxxxx" }
```

On success it returns:

```json
{ "access_token": "gho_...", "token_type": "bearer", "scope": "public_repo" }
```

Errors are `{ "error": "<short-reason>" }` with an appropriate status.

### Why these checks?
- `client_id` is verified against `GITHUB_CLIENT_ID` — this Worker only knows
  one OAuth App's secret, so any other `client_id` would fail at GitHub
  anyway. Failing early gives a cleaner error.
- `Origin` is allowlisted via `ALLOWED_ORIGINS`. CORS is the browser's job to
  enforce, but combined with the GitHub-side callback URL allowlist it makes
  drive-by abuse of this endpoint harder.
- GitHub's error body is **not** echoed verbatim — only the short `error`
  code (e.g. `bad_verification_code`).

## Notes

- Free tier covers ~100k requests/day — wildly more than this needs.
- The Worker is stateless: no KV, no D1, no Durable Objects.
- To rotate the secret, regenerate it on GitHub, then re-run
  `pnpm wrangler secret put GITHUB_CLIENT_SECRET`.
