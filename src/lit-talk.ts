import {LitElement, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import './components/comment-box/comment-box';
import './components/comment-list/comment-list';
import {Effect, Console} from 'effect';
import {
  createIssueEffect,
  fetchAccessTokenEffect,
  fetchUserInfoEffect,
  findIssueByLabelsEffect,
  findIssueCommentsEffect,
} from './effects/effects';
import {ACCESS_TOKEN_LOCAL_STORAGE_KEY} from './constant';
import {emitter, EventTypes} from './events';

export interface IGitHubOauthOptions {
  client_id: string;
  client_secret: string;
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
        if (value) {
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
        }
        return undefined;
      },
    },
  })
  githubOauthOptions: IGitHubOauthOptions = {
    client_id: '',
    client_secret: '',
    repo: '',
    owner: '',
    label: '',
    title: '',
    scope: '',
    prompt: '',
    proxy: '',
    postUniqueId: '', // The unique id of each post. Used for the tag in the github issue.
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
  commentLists: any[] = [];

  override connectedCallback() {
    super.connectedCallback();

    emitter.on(EventTypes.TOKEN_READY, () => {
      Effect.runPromise(
        this.runInitEffect({
          owner: this.githubOauthOptions.owner,
          repo: this.githubOauthOptions.repo,
          labels: {
            label: this.githubOauthOptions.label || this.defaultLabel,
            postId: this.githubOauthOptions.postUniqueId as string,
          },
        })
      ).catch((error) => {
        console.error('Error executing initEffect:', error);
      });
    });

    emitter.on(EventTypes.COMMENT_ADDED, () => {
      Effect.runPromise(
        this.fetchCommentsEffect({issueId: String(this.theIssueData?.number)})
      );
    });

    console.log('options', this.githubOauthOptions);

    // Check for code in URL when component connects to DOM
    const urlParams = new URLSearchParams(window.location.search);
    this.githubOauthCode = urlParams.get('code') || undefined;

    // If code exists, exchange it for an access token (which includes fetching comments)
    if (this.githubOauthCode) {
      this.exchangeCodeForToken(this.githubOauthCode);
    }
    // If no code but we have a stored access token, just fetch comments
    else {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY);
      if (storedToken) {
        this.accessToken = storedToken;
        emitter.emit(EventTypes.TOKEN_READY, storedToken);
      }
    }
  }

  exchangeCodeForToken(code: string) {
    // Run the effect
    Effect.runPromise(this.fetchTokenEffect(code)).catch((error) => {
      console.error('Error exchanging code for token:', error);
    });
  }

  private fetchCommentsEffect({issueId}: {issueId: string} = {issueId: '1'}) {
    return Effect.sync(() => {
      this.isLoading = true;
    }).pipe(
      Effect.flatMap(() =>
        findIssueCommentsEffect({
          owner: this.githubOauthOptions.owner,
          repo: this.githubOauthOptions.repo,
          issue: issueId,
        })
      ),
      Effect.flatMap((response) => {
        return Effect.tryPromise({
          try: () => response.json(),
          catch: () => new Error('Invalid response format'),
        });
      }),
      Effect.tap((data) => {
        if (data.message === 'Bad credentials') {
          this.error = data.message;
          localStorage.removeItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY);
        }
        this.commentLists = data;
      }),
      Effect.tap(() => {
        this.isLoading = false;
      }),
      Effect.tapError((err) => {
        this.error = err.message;
        return Console.log('error', err.message);
      }),
      Effect.onError(() =>
        Effect.sync(() => {
          this.isLoading = false;
        })
      )
    );
  }

  private fetchTokenEffect(code: string) {
    return Effect.sync(() => {
      this.isLoading = true;
    }).pipe(
      Effect.flatMap(() =>
        fetchAccessTokenEffect({
          code,
          clientId: this.githubOauthOptions.client_id,
          clientSecret: this.githubOauthOptions.client_secret,
          proxy: this.githubOauthOptions.proxy,
        })
      ),
      Effect.flatMap((response) => {
        console.log('response', response);

        if (!response.ok) {
          return Effect.fail(
            new Error(`Failed to exchange code: ${response.statusText}`)
          );
        }

        return Effect.tryPromise({
          try: () => response.json(),
          catch: () => new Error('Invalid response format'),
        });
      }),
      Effect.tap((data) => {
        console.log('data', data);
        this.accessToken = data.access_token;
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        localStorage.setItem(ACCESS_TOKEN_LOCAL_STORAGE_KEY, data.access_token);
        emitter.emit(EventTypes.TOKEN_READY, data.access_token);
      }),
      Effect.tap(() => {
        this.isLoading = false;
      }),
      Effect.tapError((err) => {
        this.error = err.message;
        return Console.log('error', err.message);
      }),
      Effect.onError(() =>
        Effect.sync(() => {
          this.isLoading = false;
        })
      )
    );
  }

  override disconnectedCallback() {
    emitter.off(EventTypes.TOKEN_READY);
    emitter.off(EventTypes.COMMENT_ADDED);
    super.disconnectedCallback();
  }

  private runInitEffect = ({
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
    return Effect.sync(() => {
      // Initialize any needed state
      this.isLoading = true;
      console.log('initEffect', labels);
    }).pipe(
      // First: Fetch user info
      Effect.flatMap(() => fetchUserInfoEffect()),
      Effect.flatMap((userResponse) =>
        Effect.tryPromise({
          try: () => userResponse.json(),
          catch: (error) =>
            new Error(`Failed to parse user data: ${String(error)}`),
        }).pipe(
          Effect.tap((userData) => {
            this.githubUser = userData;
          })
        )
      ),

      // Second: Find issue by labels
      Effect.flatMap((userData) =>
        findIssueByLabelsEffect({owner, repo, labels}).pipe(
          Effect.map((issueResponse) => ({userData, issueResponse}))
        )
      ),
      Effect.flatMap(({userData, issueResponse}) =>
        Effect.tryPromise({
          try: () => issueResponse.json(),
          catch: (error) =>
            new Error(`Failed to parse issue data: ${String(error)}`),
        }).pipe(
          Effect.map((issueData) => {
            console.log({userData, issueData});
            return {userData, issueData};
          }),
          Effect.tap(({issueData}) => {
            this.theIssueData = issueData[0];
            //this.githubUser = userData;
          })
        )
      ),
      // Third: Find comments for the found issue
      Effect.flatMap(({issueData}) => {
        if (!this.theIssueData) {
          console.log('No issue found, creating one...');

          return createIssueEffect({
            owner: this.githubOauthOptions.owner,
            repo: this.githubOauthOptions.repo,
            title:
              document.title || `Discussion for ${window.location.pathname}`,
            labels: [
              this.githubOauthOptions.label || this.defaultLabel,
              this.githubOauthOptions.postUniqueId,
            ],
            body: `This issue was automatically created for the page: ${window.location.href}`,
          }).pipe(
            // After creating the issue, parse the response
            Effect.flatMap((response) =>
              Effect.tryPromise({
                try: () => response.json(),
                catch: (error) =>
                  new Error(`Failed to parse created issue: ${String(error)}`),
              })
            ),
            // Save the newly created issue
            Effect.tap((newIssue) => {
              console.log('Created new issue:', newIssue);
              this.theIssueData = newIssue;
              // Now that we have a new issue, we don't need to fetch comments yet (it's new)
              this.commentLists = [];
              this.isLoading = false;
            })
          );
        }

        // Get the first issue number
        const issueNumber = issueData[0].number.toString();

        return this.fetchCommentsEffect({issueId: issueNumber});
      }),

      // Handle errors throughout the chain
      Effect.tapError((error) =>
        Effect.sync(() => console.error('Init effect error:', error))
      )
    );
  };
  override render() {
    if (this.isLoading) {
      return html`
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading...</div>
        </div>
      `;
    }
    if (this.error) {
      return html`
        <div class="error-container">
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
      ></comment-box>
      <comment-list .comments=${this.commentLists}></comment-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-talk': LitTalk;
  }
}
