import {Effect} from 'effect';
import {gitHubAccessTokenProxyUrl, gitHubBaseUrl} from '../github/github-apis';
import {ACCESS_TOKEN_LOCAL_STORAGE_KEY} from '../constant';
import {emitter, EventTypes} from '../events';

export const postCommentEffect = ({
  owner,
  repo,
  issue,
  comment,
}: {
  owner: string;
  repo: string;
  issue: string;
  comment: string;
}) =>
  Effect.tryPromise({
    try: () =>
      fetch(
        `${gitHubBaseUrl}/repos/${owner}/${repo}/issues/${issue}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${localStorage.getItem(
              ACCESS_TOKEN_LOCAL_STORAGE_KEY
            )}`,
          },
          body: JSON.stringify({body: comment}),
        }
      ),
    catch: (error) => new Error(`Network error: ${String(error)}`),
  }).pipe(
    Effect.tap((response) => {
      if (response.status === 201) {
        emitter.emit(EventTypes.COMMENT_ADDED);
      }
    })
  );

export const findIssueCommentsEffect = ({
  owner,
  repo,
  issue,
}: {
  owner: string;
  repo: string;
  issue: string;
}) =>
  Effect.tryPromise({
    try: () =>
      fetch(
        `${gitHubBaseUrl}/repos/${owner}/${repo}/issues/${issue}/comments?${new URLSearchParams(
          {sort: 'created', direction: 'desc'}
        )}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${
              localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY) || ''
            }`,
          },
        }
      ),
    catch: (error) => new Error(`Network error: ${String(error)}`),
  });

export const fetchUserInfoEffect = () => {
  return Effect.tryPromise({
    try: () =>
      fetch(`${gitHubBaseUrl}/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${
            localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY) || ''
          }`,
        },
      }),
    catch: (error) => new Error(`Network error: ${String(error)}`),
  });
};
export const fetchAccessTokenEffect = ({
  code,
  clientId,
  clientSecret,
  proxy,
}: {
  code: string;
  clientId: string;
  clientSecret: string;
  proxy?: string;
}) => {
  return Effect.tryPromise({
    try: () =>
      fetch(proxy ?? gitHubAccessTokenProxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }),
    catch: (error) => new Error(`Network error: ${String(error)}`),
  });
};
export const createIssueEffect = ({
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
}) => {
  return Effect.tryPromise({
    try: () =>
      fetch(`${gitHubBaseUrl}/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${
            localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY) || ''
          }`,
          'X-Github-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title,
          body,
          labels,
        }),
      }),
    catch: (error) => new Error(`Network error: ${String(error)}`),
  });
};

export const findIssueByLabelsEffect = ({
  owner,
  repo,
  labels,
}: {
  owner: string;
  repo: string;
  labels: {
    postId: string;
    label: string;
  };
}) => {
  const query = {
    labels: Object.values(labels).join(),
  };
  return Effect.tryPromise({
    try: () =>
      fetch(
        `${gitHubBaseUrl}/repos/${owner}/${repo}/issues?${new URLSearchParams(
          query
        )}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${
              localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY) || ''
            }`,
          },
        }
      ),
    catch: (error) => new Error(`Network error: ${String(error)}`),
  });
};
