import {expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';
import '../src/components/comment-box/comment-box.js';
import type {CommentBox} from '../src/components/comment-box/comment-box.js';
import type {IGitHubOauthOptions} from '../src/lit-talk.js';
import {
  OAUTH_STATE_STORAGE_KEY,
  ACCESS_TOKEN_LOCAL_STORAGE_KEY,
} from '../src/constant.js';
import {fakeResponse, restoreAll, clearStorage} from './helpers.js';

function makeOptions(over: Partial<IGitHubOauthOptions> = {}): IGitHubOauthOptions {
  return {
    client_id: 'cid',
    repo: 'site',
    owner: 'me',
    label: '',
    title: '',
    scope: '',
    prompt: '',
    proxy: '',
    postUniqueId: 'post-1',
    ...over,
  };
}

const loggedInUser: GitHubUser = {
  login: 'alice',
  id: 1,
  avatar_url: 'a',
} as GitHubUser;

const issueData: GitHubIssueData = {number: 42} as GitHubIssueData;

suite('<comment-box>', () => {
  setup(() => {
    clearStorage();
  });

  teardown(() => {
    restoreAll();
    clearStorage();
  });

  test('disables textarea when not logged in', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box .options=${makeOptions()}></comment-box>`
    );
    const ta = el.shadowRoot!.querySelector('textarea')!;
    expect(ta.disabled).to.be.true;
    expect(ta.placeholder).to.match(/Login/i);
  });

  test('shows the login button when not logged in', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box .options=${makeOptions()}></comment-box>`
    );
    expect(el.shadowRoot!.querySelector('.btn-login-with-github')).to.exist;
    expect(el.shadowRoot!.querySelector('.btn-comment')).to.not.exist;
  });

  test('shows the Comment button when logged in', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
      ></comment-box>`
    );
    expect(el.shadowRoot!.querySelector('.btn-comment')).to.exist;
    expect(el.shadowRoot!.querySelector('.btn-login-with-github')).to.not.exist;
  });

  test('login redirects to GitHub OAuth with state stored in sessionStorage', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box .options=${makeOptions({scope: 'public_repo read:user', prompt: 'consent'})}></comment-box>`
    );
    const navStub = sinon.stub(el, '_navigateTo');
    el._handleLogin();
    expect(navStub.calledOnce).to.be.true;
    const url = new URL(navStub.firstCall.args[0] as string);
    expect(url.origin + url.pathname).to.equal(
      'https://github.com/login/oauth/authorize'
    );
    expect(url.searchParams.get('client_id')).to.equal('cid');
    expect(url.searchParams.get('scope')).to.equal('public_repo read:user');
    expect(url.searchParams.get('prompt')).to.equal('consent');
    const stored = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
    expect(stored).to.equal(url.searchParams.get('state'));
    expect(stored).to.match(/^[0-9a-f]{32}$/);
  });

  test('default _navigateTo delegates to navigateTo (hash-only nav avoids reload)', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box .options=${makeOptions()}></comment-box>`
    );
    const before = window.location.pathname + window.location.search + window.location.hash;
    try {
      el._navigateTo('#litTalk-test-fragment');
      expect(window.location.hash).to.equal('#litTalk-test-fragment');
    } finally {
      window.history.replaceState({}, '', before);
    }
  });

  test('login defaults scope to public_repo and omits prompt when not provided', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box .options=${makeOptions()}></comment-box>`
    );
    const navStub = sinon.stub(el, '_navigateTo');
    el._handleLogin();
    const url = new URL(navStub.firstCall.args[0] as string);
    expect(url.searchParams.get('scope')).to.equal('public_repo');
    expect(url.searchParams.has('prompt')).to.be.false;
  });

  test('login sets postError and bails if client_id is missing', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box .options=${makeOptions({client_id: ''})}></comment-box>`
    );
    el._handleLogin();
    expect(el.postError).to.match(/client_id/);
  });

  test('typing updates commentText', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    const ta = el.shadowRoot!.querySelector('textarea')!;
    ta.value = 'hello';
    ta.dispatchEvent(new InputEvent('input'));
    expect(el.commentText).to.equal('hello');
  });

  test('Comment button is disabled when textarea is empty', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    const btn = el.shadowRoot!.querySelector('.btn-comment') as HTMLButtonElement;
    expect(btn.disabled).to.be.true;
  });

  test('posts comment, clears text, dispatches comment-added on 201', async () => {
    localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, 'tok');
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({}, {status: 201}));
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    let dispatched = 0;
    let bubbled = false;
    let composed = false;
    el.addEventListener('comment-added', (e) => {
      dispatched += 1;
      bubbled = e.bubbles;
      composed = (e as CustomEvent).composed;
    });

    el.commentText = ' hi ';
    await el._postComment();
    expect(el.commentText).to.equal('');
    expect(dispatched).to.equal(1);
    expect(bubbled).to.be.true;
    expect(composed).to.be.true;
    expect(fetchStub.calledOnce).to.be.true;
  });

  test('preserves draft and surfaces error on non-201', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({}, {status: 422}));
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    el.commentText = 'draft';
    await el._postComment();
    expect(el.commentText).to.equal('draft');
    expect(el.postError).to.match(/422/);
  });

  test('preserves draft when fetch throws', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.rejects(new Error('boom'));
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    el.commentText = 'draft';
    await el._postComment();
    expect(el.commentText).to.equal('draft');
    expect(el.postError).to.match(/boom/);
  });

  test('handles non-Error throw values', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch');
    // .rejects(string) wraps in Error — use callsFake to reject with a primitive.
    fetchStub.callsFake(() => Promise.reject('plain-string'));
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    el.commentText = 'x';
    await el._postComment();
    expect(el.postError).to.match(/plain-string/);
  });

  test('no-ops when called while already posting', async () => {
    sinon.stub(globalThis, 'fetch').resolves(fakeResponse({}, {status: 201}));
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    el.commentText = 'x';
    el.isPosting = true;
    await el._postComment();
    expect(el.commentText).to.equal('x'); // not cleared
  });

  test('bails when owner or repo is missing', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions({owner: ''})}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    el.commentText = 'x';
    await el._postComment();
    expect(el.postError).to.match(/owner\/repo/);
  });

  test('bails when issueData is missing', async () => {
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
      ></comment-box>`
    );
    el.commentText = 'x';
    await el._postComment();
    expect(el.postError).to.match(/No issue/);
  });

  test('no-ops when commentText is whitespace-only', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({}, {status: 201}));
    const el = await fixture<CommentBox>(
      html`<comment-box
        .options=${makeOptions()}
        .githubUser=${loggedInUser}
        .issueData=${issueData}
      ></comment-box>`
    );
    el.commentText = '   ';
    await el._postComment();
    expect(fetchStub.called).to.be.false;
  });
});
