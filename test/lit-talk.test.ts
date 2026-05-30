import {expect, fixture, html} from '@open-wc/testing';
import sinon from 'sinon';
import '../src/lit-talk.js';
import {LitTalk, IGitHubOauthOptions} from '../src/lit-talk.js';
import {
  ACCESS_TOKEN_LOCAL_STORAGE_KEY,
  OAUTH_STATE_STORAGE_KEY,
} from '../src/constant.js';
import {fakeResponse, restoreAll, clearStorage} from './helpers.js';

function dispatchCommentAdded(host: HTMLElement): void {
  // Dispatch from the rendered <comment-box> child so the bubbling/composed
  // path is exercised the same way the real component does.
  const box = host.shadowRoot!.querySelector('comment-box');
  if (!box) throw new Error('comment-box not rendered');
  box.dispatchEvent(
    new CustomEvent('comment-added', {bubbles: true, composed: true})
  );
}

function fullOptions(over: Partial<IGitHubOauthOptions> = {}): IGitHubOauthOptions {
  return {
    client_id: 'cid',
    repo: 'site',
    owner: 'me',
    label: '',
    title: '',
    scope: '',
    prompt: '',
    proxy: 'https://proxy.example.com/x',
    postUniqueId: 'post-1',
    ...over,
  };
}

const fakeUser: GitHubUser = {
  login: 'alice',
  id: 1,
  avatar_url: 'a',
} as GitHubUser;

const fakeIssue: GitHubIssueData = {number: 7} as GitHubIssueData;

/**
 * Sets the URL via history API so connectedCallback can read window.location.search.
 * Restores the URL on teardown.
 */
function setUrl(search: string, hash = '') {
  const original = window.location.pathname + window.location.search + window.location.hash;
  window.history.replaceState({}, '', '/' + (search ? `?${search}` : '') + hash);
  return () => window.history.replaceState({}, '', original);
}

suite('<lit-talk>', () => {
  let restoreUrl: (() => void) | undefined;

  setup(() => {
    clearStorage();
  });

  teardown(() => {
    restoreUrl?.();
    restoreUrl = undefined;
    restoreAll();
    clearStorage();
  });

  // ----- attribute converter -----

  suite('attribute converter', () => {
    test('parses valid JSON from the attribute', async () => {
      const el = await fixture<LitTalk>(
        html`<lit-talk
          github-oauth-options='{"postUniqueId":"p","client_id":"cid","owner":"me","repo":"r","proxy":"https://proxy.example.com"}'
        ></lit-talk>`
      );
      expect(el.githubOauthOptions.postUniqueId).to.equal('p');
    });

    test('logs an error and resets to {} when postUniqueId is missing', async () => {
      const errorSpy = sinon.stub(console, 'error');
      const el = await fixture<LitTalk>(
        html`<lit-talk github-oauth-options='{"client_id":"x"}'></lit-talk>`
      );
      expect(errorSpy.called).to.be.true;
      // Reset to {} → validation surfaces a clear missing-required error.
      expect(el.error).to.match(/Missing required/);
    });

    test('logs an error and resets to {} on invalid JSON', async () => {
      const errorSpy = sinon.stub(console, 'error');
      const el = await fixture<LitTalk>(
        html`<lit-talk github-oauth-options='{ broken'></lit-talk>`
      );
      expect(errorSpy.called).to.be.true;
      expect(el.error).to.match(/Missing required/);
    });

    test('treats empty attribute as missing options (no crash)', async () => {
      const el = await fixture<LitTalk>(
        html`<lit-talk github-oauth-options=""></lit-talk>`
      );
      expect(el.error).to.match(/Missing required/);
    });
  });

  // ----- validation -----

  test('renders an error when required options are missing', async () => {
    const el = await fixture<LitTalk>(html`<lit-talk></lit-talk>`);
    expect(el.error).to.match(/Missing required/);
    expect(el.shadowRoot!.querySelector('.error-container')).to.exist;
  });

  // ----- render states -----

  test('renders the loading container when isLoading', async () => {
    const el = await fixture<LitTalk>(html`<lit-talk></lit-talk>`);
    el.error = undefined;
    el.isLoading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.loading-container')).to.exist;
  });

  test('renders the comment-box + comment-list when idle', async () => {
    const el = await fixture<LitTalk>(html`<lit-talk></lit-talk>`);
    el.error = undefined;
    el.isLoading = false;
    el.githubOauthOptions = fullOptions();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('comment-box')).to.exist;
    expect(el.shadowRoot!.querySelector('comment-list')).to.exist;
  });

  // ----- OAuth CSRF -----

  test('aborts and shows an error when OAuth state is missing in sessionStorage', async () => {
    restoreUrl = setUrl('code=abc&state=xyz');
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    expect(el.error).to.match(/CSRF/);
    expect(el.githubOauthCode).to.be.undefined;
  });

  test('aborts and shows an error when OAuth state mismatches', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'expected');
    restoreUrl = setUrl('code=abc&state=different');
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    expect(el.error).to.match(/CSRF/);
    // Stored state is consumed even on failure.
    expect(sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY)).to.be.null;
  });

  test('proceeds with token exchange when OAuth state matches', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=goodcode&state=ok');
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub
      // proxy token exchange
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}, {status: 200}))
      // /user
      .onCall(1).resolves(fakeResponse(fakeUser))
      // issues?labels=
      .onCall(2).resolves(fakeResponse([fakeIssue]))
      // issue comments
      .onCall(3).resolves(fakeResponse([]));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    // Wait for chained async work to settle.
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY)).to.equal('tok');
    expect(el.accessToken).to.equal('tok');
  });

  test('emits TOKEN_READY when a token is already in localStorage and no code in URL', async () => {
    localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, 'preexisting');
    restoreUrl = setUrl('');
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    expect(el.accessToken).to.equal('preexisting');
  });

  // ----- token exchange failure paths -----

  test('surfaces an error when the proxy returns non-2xx', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({}, {status: 500, statusText: 'Boom'}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 5; i++) await el.updateComplete;
    expect(el.error).to.match(/Failed to exchange code/);
  });

  test('surfaces error message when proxy omits access_token', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({error: 'bad_verification_code'}, {status: 200}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 5; i++) await el.updateComplete;
    expect(el.error).to.equal('bad_verification_code');
  });

  test('runTokenExchange handles non-Error throw values', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon.stub(globalThis, 'fetch').callsFake(() => Promise.reject('tokenplain'));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 5; i++) await el.updateComplete;
    expect(el.error).to.equal('tokenplain');
  });

  test('falls back to a generic message when proxy returns no access_token and no error', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({}, {status: 200}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 5; i++) await el.updateComplete;
    expect(el.error).to.match(/No access_token/);
  });

  test('replaceState preserves the window.location.hash after token exchange', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok', '#section');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([fakeIssue]))
      .onCall(3).resolves(fakeResponse([]));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(window.location.hash).to.equal('#section');
  });

  // ----- runInit success/failure paths -----

  test('runInit creates an issue when none exists', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    const createdIssue = {number: 99} as GitHubIssueData;
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([])) // no issue matching labels
      .onCall(3).resolves(fakeResponse(createdIssue, {status: 201}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.theIssueData?.number).to.equal(99);
    expect(el.commentLists).to.deep.equal([]);
  });

  test('runInit uses configured title when creating an issue', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    const fetchStub = sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([]))
      .onCall(3).resolves(fakeResponse({number: 1} as GitHubIssueData, {status: 201}));
    const el = await fixture<LitTalk>(
      html`<lit-talk .githubOauthOptions=${fullOptions({title: 'Custom Title'})}></lit-talk>`
    );
    for (let i = 0; i < 10; i++) await el.updateComplete;
    const createCall = fetchStub.getCall(3);
    const body = JSON.parse(createCall.args[1]!.body as string);
    expect(body.title).to.equal('Custom Title');
  });

  test('runInit applies the configured label when creating an issue', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    const fetchStub = sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([]))
      .onCall(3).resolves(fakeResponse({number: 1} as GitHubIssueData, {status: 201}));
    const el = await fixture<LitTalk>(
      html`<lit-talk .githubOauthOptions=${fullOptions({label: 'CustomLabel'})}></lit-talk>`
    );
    for (let i = 0; i < 10; i++) await el.updateComplete;
    const createCall = fetchStub.getCall(3);
    const body = JSON.parse(createCall.args[1]!.body as string);
    expect(body.labels).to.deep.equal(['CustomLabel', 'post-1']);
  });

  test('runInit raises when issue creation fails', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([]))
      .onCall(3).resolves(fakeResponse({message: 'Validation Failed'}, {status: 422}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('Validation Failed');
  });

  test('runInit falls back to HTTP status when error body has no message', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([]))
      .onCall(3).resolves(fakeResponse({}, {status: 503}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.match(/HTTP 503/);
  });

  test('runInit raises when create returns ok but no issue number', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([]))
      .onCall(3).resolves(fakeResponse({something: 'else'}, {status: 201}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.match(/unexpected payload/);
  });

  test('runInit clears token + surfaces error on Bad credentials from /user', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse({message: 'Bad credentials'}, {status: 401}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.match(/log in again/);
    expect(localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY)).to.be.null;
    expect(el.accessToken).to.be.undefined;
  });

  test('runInit raises when issue lookup returns a non-array', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse({message: 'Not Found'}, {status: 404}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('Not Found');
  });

  test('runInit raises a generic message when issue lookup error has no message', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse({}, {status: 500}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.match(/Unexpected issue lookup/);
  });

  // ----- loadComments -----

  test('loadComments stores comments on success', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    const comments = [{id: 1, body: 'hi'} as GitHubComment];
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([fakeIssue]))
      .onCall(3).resolves(fakeResponse(comments));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.commentLists).to.deep.equal(comments);
  });

  test('loadComments clears auth on Bad credentials and empties list', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([fakeIssue]))
      .onCall(3).resolves(fakeResponse({message: 'Bad credentials'}, {status: 401}));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('Bad credentials');
    expect(el.commentLists).to.deep.equal([]);
    expect(localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY)).to.be.null;
  });

  test('loadComments uses fallback message when error body has no message', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([fakeIssue]))
      .onCall(3).resolves(fakeResponse(null));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.match(/Unexpected response/);
  });

  test('loadComments surfaces a thrown error', async () => {
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).resolves(fakeResponse(fakeUser))
      .onCall(2).resolves(fakeResponse([fakeIssue]))
      .onCall(3).rejects(new Error('netfail'));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('netfail');
  });

  test('loadComments surfaces non-Error throw values', async () => {
    localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, 'tok');
    restoreUrl = setUrl('');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse(fakeUser))
      .onCall(1).resolves(fakeResponse([fakeIssue]))
      .onCall(2).callsFake(() => Promise.reject('plain'));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('plain');
  });

  // ----- COMMENT_ADDED handling -----

  test('reloads comments when a child dispatches comment-added (issue set)', async () => {
    localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, 'tok');
    restoreUrl = setUrl('');
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub
      .onCall(0).resolves(fakeResponse(fakeUser))
      .onCall(1).resolves(fakeResponse([fakeIssue]))
      .onCall(2).resolves(fakeResponse([]))
      .onCall(3).resolves(fakeResponse([{id: 1, body: 'new'} as GitHubComment]));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.theIssueData?.number).to.equal(7);
    dispatchCommentAdded(el);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.commentLists).to.deep.equal([{id: 1, body: 'new'}]);
  });

  test('does nothing on comment-added if no issue is set', async () => {
    restoreUrl = setUrl('');
    // Render with valid options but no token → no fetch chain runs;
    // comment-box still renders so we can dispatch from it.
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    await el.updateComplete;
    const fetchStub = sinon.stub(globalThis, 'fetch');
    dispatchCommentAdded(el);
    await el.updateComplete;
    expect(fetchStub.called).to.be.false;
  });

  // ----- runInit error logging -----

  test('logs and surfaces errors from runInit', async () => {
    const errorSpy = sinon.stub(console, 'error');
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, 'ok');
    restoreUrl = setUrl('code=c&state=ok');
    sinon
      .stub(globalThis, 'fetch')
      .onCall(0).resolves(fakeResponse({access_token: 'tok'}))
      .onCall(1).rejects(new Error('userfail'));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('userfail');
    expect(errorSpy.called).to.be.true;
  });

  test('surfaces non-Error throw values from runInit', async () => {
    sinon.stub(console, 'error');
    localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, 'tok');
    restoreUrl = setUrl('');
    sinon
      .stub(globalThis, 'fetch')
      .callsFake(() => Promise.reject('netplain'));
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('netplain');
  });

  test('surfaces JSON parse failures from /user as error', async () => {
    localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, 'tok');
    restoreUrl = setUrl('');
    const crashing = {
      ok: true,
      status: 200,
      statusText: '',
      json: async () => {
        throw new Error('parsefail');
      },
    } as unknown as Response;
    sinon.stub(globalThis, 'fetch').resolves(crashing);
    sinon.stub(console, 'error');
    const el = await fixture<LitTalk>(html`<lit-talk .githubOauthOptions=${fullOptions()}></lit-talk>`);
    for (let i = 0; i < 10; i++) await el.updateComplete;
    expect(el.error).to.equal('parsefail');
  });
});
