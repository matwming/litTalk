import {LitElement, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import './components/comment-box/comment-box';
import './components/comment-list/comment-list';
import {
  createIssue,
  fetchAccessToken,
  fetchUserInfo,
  findIssueByLabels,
  findIssueComments,
} from './github/api';
import {
  ACCESS_TOKEN_LOCAL_STORAGE_KEY,
  OAUTH_STATE_STORAGE_KEY,
} from './constant';

export interface IGitHubOauthOptions {
  client_id: string;
  /**
   * @deprecated Do not pass the OAuth Client Secret to the browser. The
   * consumer's `proxy` endpoint must hold the secret server-side.
   */
  client_secret?: string;
  repo: string;
  owner: string;
  label: string;
  title: string;
  scope: string;
  prompt: string;
  proxy: string;
  postUniqueId: string;
}

@customElement('lit-talk')
export class LitTalk extends LitElement {
  defaultLabel = 'LitTalk';

  @property({
    attribute: 'github-oauth-options',
    converter: {
      fromAttribute: (value) => {
        if (!value) return {};
        try {
          const result = JSON.parse(value);
          if (!result.postUniqueId) {
            throw new Error('postUniqueId is required for tagging purposes');
          }
          return result;
        } catch (e) {
          console.error('Invalid JSON in github-oauth-options attribute', e);
          return {};
        }
      },
    },
  })
  githubOauthOptions: IGitHubOauthOptions = {
    client_id: '',
    repo: '',
    owner: '',
    label: '',
    title: '',
    scope: '',
    prompt: '',
    proxy: '',
    postUniqueId: '',
  };

  @state()
  theIssueData?: GitHubIssueData;

  @state()
  githubUser?: GitHubUser;

  @property({type: String})
  githubOauthCode?: string;

  @state()
  accessToken?: string;

  @state()
  isLoading = false;

  @state()
  error?: string;

  @state()
  commentLists: GitHubComment[] = [];

  private _validateOptions(): string | undefined {
    const {client_id, owner, repo, postUniqueId} = this.githubOauthOptions;
    const missing = [
      !client_id && 'client_id',
      !owner && 'owner',
      !repo && 'repo',
      !postUniqueId && 'postUniqueId',
    ].filter(Boolean);
    if (missing.length) {
      return `Missing required github-oauth-options: ${missing.join(', ')}`;
    }
    return undefined;
  }

  override connectedCallback() {
    super.connectedCallback();

    const validationError = this._validateOptions();
    if (validationError) {
      this.error = validationError;
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    this.githubOauthCode = urlParams.get('code') || undefined;
    const returnedState = urlParams.get('state') || undefined;

    if (this.githubOauthCode) {
      // Verify CSRF state — fail closed. An unsolicited callback (missing
      // stored state) is just as suspicious as a mismatched one: in either
      // case the user did not start this login from this widget.
      const expectedState = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
      sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
      if (!expectedState || expectedState !== returnedState) {
        this.error = 'OAuth state mismatch — possible CSRF. Login aborted.';
        this.githubOauthCode = undefined;
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.hash
        );
        return;
      }
      this.exchangeCodeForToken(this.githubOauthCode);
    } else {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY);
      if (storedToken) {
        this.accessToken = storedToken;
        void this.runInit();
      }
    }
  }

  exchangeCodeForToken(code: string) {
    void this.runTokenExchange(code);
  }

  private _onCommentAdded(): void {
    const issueNumber = this.theIssueData?.number;
    if (issueNumber == null) return;
    void this.loadComments(String(issueNumber));
  }

  private async loadComments(issueId: string): Promise<void> {
    this.isLoading = true;
    try {
      const response = await findIssueComments({
        owner: this.githubOauthOptions.owner,
        repo: this.githubOauthOptions.repo,
        issue: issueId,
      });
      const data: GitHubComment[] | GitHubErrorResponse = await response.json();

      if (!Array.isArray(data)) {
        if (data?.message === 'Bad credentials') {
          localStorage.removeItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY);
          this.accessToken = undefined;
          this.githubUser = undefined;
        }
        this.error = data?.message ?? 'Unexpected response from GitHub';
        this.commentLists = [];
        return;
      }
      this.error = undefined;
      this.commentLists = data;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isLoading = false;
    }
  }

  private async runTokenExchange(code: string): Promise<void> {
    this.isLoading = true;
    try {
      const response = await fetchAccessToken({
        code,
        clientId: this.githubOauthOptions.client_id,
        proxy: this.githubOauthOptions.proxy,
      });
      if (!response.ok) {
        throw new Error(`Failed to exchange code: ${response.statusText}`);
      }
      const data: {access_token?: string; error?: string} = await response.json();
      if (!data.access_token) {
        throw new Error(data.error || 'No access_token in proxy response');
      }
      this.accessToken = data.access_token;
      // Preserve the hash so consumers using hash-based routing aren't broken.
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.hash
      );
      localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, data.access_token);
      await this.runInit();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isLoading = false;
    }
  }

  private async runInit(): Promise<void> {
    this.isLoading = true;
    try {
      const {owner, repo} = this.githubOauthOptions;
      const labels = {
        label: this.githubOauthOptions.label || this.defaultLabel,
        postId: this.githubOauthOptions.postUniqueId,
      };

      // 1. Fetch the authenticated user.
      const userResponse = await fetchUserInfo();
      const userData: GitHubUser | GitHubErrorResponse = await userResponse.json();
      if ((userData as GitHubErrorResponse).message === 'Bad credentials') {
        localStorage.removeItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY);
        this.accessToken = undefined;
        this.githubUser = undefined;
        throw new Error('Stored token rejected by GitHub — please log in again.');
      }
      this.githubUser = userData as GitHubUser;

      // 2. Look up the issue for this post by labels.
      const issueResponse = await findIssueByLabels({owner, repo, labels});
      const issueData: GitHubIssueData[] | GitHubErrorResponse =
        await issueResponse.json();
      if (!Array.isArray(issueData)) {
        throw new Error(
          (issueData as GitHubErrorResponse).message ||
            'Unexpected issue lookup response'
        );
      }
      this.theIssueData = issueData[0];

      // 3. Either fetch comments or create the issue if it doesn't exist yet.
      if (!this.theIssueData) {
        const createResponse = await createIssue({
          owner,
          repo,
          title:
            this.githubOauthOptions.title ||
            document.title ||
            `Discussion for ${window.location.pathname}`,
          labels: [
            this.githubOauthOptions.label || this.defaultLabel,
            this.githubOauthOptions.postUniqueId,
          ],
          body: `This issue was automatically created for the page: ${window.location.href}`,
        });
        const parsed: GitHubIssueData | GitHubErrorResponse =
          await createResponse.json();
        if (!createResponse.ok) {
          throw new Error(
            (parsed as GitHubErrorResponse)?.message ||
              `Failed to create issue (HTTP ${createResponse.status}).`
          );
        }
        const newIssue = parsed as GitHubIssueData;
        if (typeof newIssue?.number !== 'number') {
          throw new Error('Issue creation returned an unexpected payload.');
        }
        this.theIssueData = newIssue;
        this.commentLists = [];
      } else {
        await this.loadComments(this.theIssueData.number.toString());
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      console.error('Init error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  override render() {
    if (this.isLoading) {
      return html`
        <div class="loading-container" role="status" aria-live="polite">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading...</div>
        </div>
      `;
    }
    if (this.error) {
      return html`
        <div class="error-container" role="alert">
          <div class="error-icon">⚠️</div>
          <div class="error-message">Error: ${this.error}</div>
        </div>
      `;
    }

    return html`
      <comment-box
        .options=${this.githubOauthOptions}
        .githubUser=${this.githubUser}
        .issueData=${this.theIssueData}
        @comment-added=${this._onCommentAdded}
      ></comment-box>
      <comment-list .comments=${this.commentLists}></comment-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-talk': LitTalk;
  }
  interface HTMLElementEventMap {
    'comment-added': CustomEvent<void>;
  }
}
