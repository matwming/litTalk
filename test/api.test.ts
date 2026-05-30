import {expect} from '@open-wc/testing';
import sinon from 'sinon';
import {
  postComment,
  findIssueComments,
  fetchUserInfo,
  fetchAccessToken,
  createIssue,
  findIssueByLabels,
} from '../src/github/api.js';
import {ACCESS_TOKEN_LOCAL_STORAGE_KEY} from '../src/constant.js';
import {fakeResponse, restoreAll, clearStorage} from './helpers.js';

suite('github/api', () => {
  let fetchStub: sinon.SinonStub;

  setup(() => {
    clearStorage();
    fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.resolves(fakeResponse({}));
  });

  teardown(() => {
    restoreAll();
    clearStorage();
  });

  test('postComment POSTs JSON body and includes auth header', async () => {
    localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, 'tok');
    await postComment({
      owner: 'me',
      repo: 'site',
      issue: '12',
      comment: 'hi',
    });
    const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal(
      'https://api.github.com/repos/me/site/issues/12/comments'
    );
    expect(init.method).to.equal('POST');
    expect(init.body).to.equal(JSON.stringify({body: 'hi'}));
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).to.equal('Bearer tok');
  });

  test('findIssueComments sends sort & direction query params', async () => {
    await findIssueComments({owner: 'me', repo: 'site', issue: '7'});
    const [url] = fetchStub.firstCall.args as [string];
    expect(url).to.include('/issues/7/comments?');
    expect(url).to.include('sort=created');
    expect(url).to.include('direction=desc');
  });

  test('fetchUserInfo hits /user', async () => {
    await fetchUserInfo();
    const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal('https://api.github.com/user');
    expect(init.method).to.equal('GET');
  });

  test('fetchUserInfo sends an empty Bearer when no token is stored', async () => {
    await fetchUserInfo();
    const [, init] = fetchStub.firstCall.args as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).to.equal('Bearer ');
  });

  test('fetchAccessToken throws synchronously without a proxy', async () => {
    let caught: Error | undefined;
    try {
      await fetchAccessToken({code: 'c', clientId: 'cid', proxy: ''});
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).to.exist;
    expect(caught!.message).to.match(/proxy/);
    expect(fetchStub.called).to.be.false;
  });

  test('fetchAccessToken POSTs {code, client_id} to the proxy', async () => {
    await fetchAccessToken({
      code: 'codez',
      clientId: 'cid',
      proxy: 'https://proxy.example.com/x',
    });
    const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal('https://proxy.example.com/x');
    expect(init.method).to.equal('POST');
    const body = JSON.parse(init.body as string);
    expect(body).to.deep.equal({code: 'codez', client_id: 'cid'});
    // Proxy should never see the client_secret.
    expect(init.body as string).to.not.include('client_secret');
  });

  test('createIssue POSTs with the GitHub API version header', async () => {
    await createIssue({
      owner: 'me',
      repo: 'site',
      title: 't',
      body: 'b',
      labels: ['A', 'B'],
    });
    const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal('https://api.github.com/repos/me/site/issues');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Github-Api-Version']).to.equal('2022-11-28');
    const body = JSON.parse(init.body as string);
    expect(body).to.deep.equal({title: 't', body: 'b', labels: ['A', 'B']});
  });

  test('findIssueByLabels joins labels into the query string', async () => {
    await findIssueByLabels({
      owner: 'me',
      repo: 'site',
      labels: {postId: 'p1', label: 'lbl'},
    });
    const [url] = fetchStub.firstCall.args as [string];
    expect(url).to.include('/issues?');
    expect(decodeURIComponent(url)).to.include('labels=p1,lbl');
  });
});
