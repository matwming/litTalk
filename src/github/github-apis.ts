//https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
export const githubOauthUrl = 'https://github.com/login/oauth/authorize';
// the access token url does not support cors. A proxy must be provided by the consumer.
export const githubAccessTokenUrl =
  'https://github.com/login/oauth/access_token';

//https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28
export const gitHubBaseUrl = 'https://api.github.com';
