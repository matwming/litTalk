# litTalk — Production Release Checklist
> Generated 2026-07-11 from the portfolio review. Portfolio summary: ~/projects/check-list.md
**Status**: Shipped — embeddable GitHub-Issues-backed comment system (`<lit-talk>` Lit web component, npm `lit-talk@2.0.0` live), but all v2.0.0 work lives only on `develop` while `main` is stale at ~1.x and workflows watch different branches.

## Do yourself (human-only)
- [ ] **Decide the branch model** (the headline decision) — either merge `develop` → `main`, or make `develop` the default branch and repoint `ci.yml`. Right now a fresh clone of the default branch shows stale ~1.x code.
- [ ] Confirm the npm Trusted Publisher (OIDC) one-time dashboard config is correct (currently working).
- [ ] Set the Worker `GITHUB_CLIENT_SECRET` via `wrangler secret put` (dashboard-managed GitHub OAuth App).
- [ ] Delete the stray already-merged `spi-3-docs-l-m` branch.

## Decisions needed
- Single trunk vs. develop-as-default: which branch becomes the source of truth for CI, publish, and deploy.
- Whether to gate npm publish on the browser test suite (currently commented out in `publish.yml`) before the next release.

## Delegate to Claude (automatable)
- Reconcile the CI / publish / deploy branch triggers to one trunk (`ci.yml` runs only on `main`; `deploy-worker.yml` triggers only on `develop`).
- Resolve the 6 TODO/FIXME markers in `src`.
- Wire the browser test suite back into `publish.yml` as a publish gate.

## Risks to keep in mind
- Fresh clone of the default branch (`main`) shows stale code — misleading to any new contributor or consumer.
- Publish path currently skips the automated browser tests.
- Worker secret is a bus-factor risk (single-person knowledge).
- my-nextjs-blog is a real downstream consumer (`lit-talk@^2.0.0`) — a broken publish breaks the blog's comments.
