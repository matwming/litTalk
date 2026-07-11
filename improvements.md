# litTalk — Improvements (UI / UX / design / workflow)
> Generated 2026-07-11 from the portfolio review. Portfolio summary: ~/projects/improvements.md

1. **Align the login button and comment box with `@quietbuildlab/ui` tokens.** litTalk currently adopts none of the shared design system; pulling in the design tokens would visually unify it with the blog it's embedded in.
2. **Optimistic render + skeleton on the comment list.** Show a skeleton while the GraphQL layer fetches, and render a newly posted comment optimistically before the round-trip confirms.
3. **Add a markdown preview tab in the comment box.** GitHub Issues bodies are markdown; a preview tab lets commenters see the rendered result before posting.
4. **Surface rate-limit and auth errors inline.** GitHub API rate limits and OAuth failures should render as inline messages in the component, not fail silently.
5. **Dark-mode theming via CSS custom properties.** Expose the component's colors as CSS custom properties so host pages (like the Astro blog) can theme it to match light/dark.
6. **Workflow: unify the branch triggers.** Beyond UI — the split between `ci.yml` (on `main`) and `deploy-worker.yml` (on `develop`) means no single branch runs the full pipeline; consolidating to one trunk removes an ongoing source of confusion.
7. **Gate publish on the browser test suite.** The `@web/test-runner` + Playwright suite is commented out of `publish.yml`; re-enabling it protects the two live consumers from regressions.
