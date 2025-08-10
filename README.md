# Lit Talk

A lightweight, embeddable comment system powered by GitHub Issues, implemented as a Web Component. Drop it into any website or framework and get comments, authentication via GitHub OAuth, and issue-based discussions per page.

- Zero framework lock-in: works with plain HTML, or any framework.
- GitHub-backed: comments are GitHub issue comments.
- One component to render and manage comments and authentication.

---

## What this package does

Lit Talk turns a GitHub repository into a comment backend for your site:

- Each page/post maps to a GitHub issue, identified by a unique “post id” label.
- Visitors log in with GitHub to comment.
- Comments are read/written directly to your repo’s issues via GitHub’s API.

This gives you a transparent, developer-friendly comment system with moderation tools and history already built into GitHub.

---

## Installation

You can use Lit Talk via npm (recommended for apps) or a CDN (great for static sites and quick embeds).

### Option A — Install from npm

```javascript
npm i lit-talk
```
- For client-side–only apps, simply import('lit-talk') at the top of your target file.
- For server-side rendering frameworks like Next.js, wrap the parent component using dynamic, for example:
```javascript
//Comments is the parent component of lit-talk
// step 1: wrap the parent with dynamic
const Comments = dynamic(() => import('@/components/Comments'), { ssr: false });

// inside Comments component
//step 2: use await and import function to load 'lit-talk'
await import('lit-talk');
```

### Option B — Load from a CDN

Use a single script tag. Prefer pinning a version.
```javascript
// replace 1.0.6 with the target version number
https://cdn.jsdelivr.net/npm/lit-talk@1.0.6/dist/lit-talk.bundle.js
```
Required fields:
- `client_id`: Your GitHub OAuth App Client ID.
- `owner`: GitHub org/user of your repo.
- `repo`: The repository used for issues/comments.
- `postUniqueId`: A unique string for the current page/post; used as a label to find/create the related issue.

Recommended fields:
- `label`: A general label to group all comment issues (defaults to “LitTalk”).
- `scope`: Typical scopes are `public_repo read:user` for public repos.
- `prompt`: e.g. `consent` to ensure a fresh consent screen.
- `proxy`: Your OAuth code-exchange endpoint URL.

Test the flow
- Load your page.
- Click “Login with GitHub.”
- Approve the OAuth request.
- You should see your GitHub user detected and be able to post a comment.
- A new issue will be created automatically if one doesn’t exist for the given `postUniqueId`.

### How to Create a GitHub OAuth App
- Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App.
- Set “Authorization callback URL” to the page where users return after login (for example, `https://your-site.example.com/`).
- After creation, you’ll get:
    - Client ID
    - Client Secret

Important: Do not expose the Client Secret in the browser.
