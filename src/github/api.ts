import {gitHubBaseUrl} from './github-apis';
import {ACCESS_TOKEN_LOCAL_STORAGE_KEY} from '../constant';

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${
      localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY) || ''
    }`,
  };
}

export function postComment({
  owner,
  repo,
  issue,
  comment,
}: {
  owner: string;
  repo: string;
  issue: string;
  comment: string;
}): Promise<Response> {
  return fetch(
    `${gitHubBaseUrl}/repos/${owner}/${repo}/issues/${issue}/comments`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({body: comment}),
    }
  );
}

export function findIssueComments({
  owner,
  repo,
  issue,
}: {
  owner: string;
  repo: string;
  issue: string;
}): Promise<Response> {
  const qs = new URLSearchParams({sort: 'created', direction: 'desc'});
  return fetch(
    `${gitHubBaseUrl}/repos/${owner}/${repo}/issues/${issue}/comments?${qs}`,
    {method: 'GET', headers: authHeaders()}
  );
}

export function fetchUserInfo(): Promise<Response> {
  return fetch(`${gitHubBaseUrl}/user`, {
    method: 'GET',
    headers: authHeaders(),
  });
}

export async function fetchAccessToken({
  code,
  clientId,
  proxy,
}: {
  code: string;
  clientId: string;
  proxy: string;
}): Promise<Response> {
  // The OAuth Client Secret must remain server-side. The consumer's proxy
  // endpoint owns it; the browser only sends `code` (+ client_id for the
  // proxy to disambiguate which app, when applicable).
  if (!proxy) {
    throw new Error(
      'A server-side `proxy` URL is required to exchange the OAuth code for a token. Never expose client_secret in the browser.'
    );
  }
  return fetch(proxy, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({code, client_id: clientId}),
  });
}

export function createIssue({
  owner,
  repo,
  title,
  body,
  labels,
}: {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}): Promise<Response> {
  return fetch(`${gitHubBaseUrl}/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'X-Github-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({title, body, labels}),
  });
}

export function findIssueByLabels({
  owner,
  repo,
  labels,
}: {
  owner: string;
  repo: string;
  labels: {postId: string; label: string};
}): Promise<Response> {
  const qs = new URLSearchParams({labels: Object.values(labels).join()});
  return fetch(
    `${gitHubBaseUrl}/repos/${owner}/${repo}/issues?${qs}`,
    {method: 'GET', headers: authHeaders()}
  );
}
