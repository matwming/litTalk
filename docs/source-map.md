# Source companion

This companion maps the source and config files that make up Lit Talk. Keep it
updated when changing public behavior, build entry points, security checks, or
deployment config.

## Runtime package

- `src/lit-talk.ts` defines the `<lit-talk>` custom element. It owns OAuth
  callback handling, option validation, token persistence, issue lookup/creation,
  comment loading, and child component wiring. Preserve the fail-closed OAuth
  state check and hash-preserving URL cleanup when editing this file.
- `src/components/comment-box/comment-box.ts` handles comment form state and
  posting. It should stay presentation-focused and emit native events back to
  `<lit-talk>` instead of importing global state.
- `src/components/comment-box/comment-box.template.ts` and
  `src/components/comment-box/comment-box.styles.ts` hold the comment-box DOM
  and scoped styles. Keep template changes in sync with required properties on
  `CommentBox`.
- `src/components/comment-list/comment-list.ts` renders the GitHub comments
  collection. Null-guard GitHub user fields because deleted users can return
  `null`.
- `src/github/api.ts` is the only browser-side GitHub HTTP wrapper. Do not add
  direct component `fetch` calls; add typed helper functions here instead.
- `src/github/types.ts` describes GitHub payloads used by the component. Add or
  narrow types here before consuming new response shapes.
- `src/github/github-apis.ts` contains the GitHub base URL constant.
- `src/constant.ts` contains local/session storage keys and shared defaults.
- `src/lib/navigate.ts` is the navigation seam used by tests.

## Worker package

- `worker/src/index.ts` is the Cloudflare Worker OAuth proxy. It exchanges GitHub
  OAuth codes for access tokens, enforces the configured client id, applies
  origin allowlisting, and returns CORS-headed errors.
- `worker/wrangler.jsonc` declares the Worker runtime config. Keep secrets in
  Wrangler or `.dev.vars`; never commit real OAuth secrets.
- `worker/.dev.vars.example` documents local environment variables.

## Build, docs, and tests

- `package.json` scripts drive package build, test, analyzer, docs, and release
  flows. `pnpm run build` is the strict TypeScript gate.
- `rollup.config.js` produces the browser bundle used by docs and publishing.
- `web-test-runner.config.js` configures browser tests under `test/`.
- `web-dev-server.config.js` serves local examples and docs.
- `docs-src/` is the Eleventy source for generated docs; `docs/` is generated
  output and should only be edited intentionally.
- `test/` contains browser-level unit tests for the element, child components,
  API helpers, and constants.
