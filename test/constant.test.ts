import {expect} from '@open-wc/testing';
import {
  ACCESS_TOKEN_LOCAL_STORAGE_KEY,
  OAUTH_STATE_STORAGE_KEY,
  DEFAULT_GITHUB_AVATAR_URL,
} from '../src/constant.js';

suite('constant', () => {
  test('exposes the localStorage key for the access token', () => {
    expect(ACCESS_TOKEN_LOCAL_STORAGE_KEY).to.equal('$$lit-talk-access-token');
  });

  test('exposes the sessionStorage key for the OAuth state', () => {
    expect(OAUTH_STATE_STORAGE_KEY).to.equal('$$lit-talk-oauth-state');
  });

  test('exposes a default GitHub avatar URL', () => {
    expect(DEFAULT_GITHUB_AVATAR_URL).to.include('avatars.githubusercontent.com');
  });
});
