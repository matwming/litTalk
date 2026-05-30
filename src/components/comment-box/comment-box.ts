import {LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {commentBoxStyles} from './comment-box.styles';
import {commentBoxTemplate} from './comment-box.template';
import {githubOauthUrl} from '../../github/github-apis';
import {IGitHubOauthOptions} from '../../lit-talk';
import {postComment} from '../../github/api';
import {OAUTH_STATE_STORAGE_KEY} from '../../constant';
import {navigateTo} from '../../lib/navigate';

/**
 * A comment box component.
 */
@customElement('comment-box')
export class CommentBox extends LitElement {
  static override styles = commentBoxStyles;

  @property({type: Object})
  options: IGitHubOauthOptions | undefined;

  @property({type: Object})
  githubUser?: GitHubUser;

  @property({type: Object})
  issueData?: GitHubIssueData;

  @state()
  commentText = '';

  @state()
  isPosting = false;

  @state()
  postError?: string;

  _handleLogin() {
    if (!this.options?.client_id) {
      this.postError = 'Missing client_id — cannot start OAuth flow.';
      return;
    }
    const state = generateOauthState();
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);
    const query: Record<string, string> = {
      client_id: this.options.client_id,
      redirect_uri: window.location.href,
      scope: this.options.scope || 'public_repo',
      state,
    };
    if (this.options.prompt) {
      query.prompt = this.options.prompt;
    }
    const oauthUrl = `${githubOauthUrl}?${new URLSearchParams(query)}`;
    this._navigateTo(oauthUrl);
  }

  /** Indirection so tests can intercept the OAuth redirect. */
  _navigateTo(url: string): void {
    navigateTo(url);
  }

  _handleCommentInput(e: InputEvent) {
    const textarea = e.target as HTMLTextAreaElement;
    this.commentText = textarea.value;
  }

  async _postComment(): Promise<void> {
    if (this.isPosting) return;
    if (!this.options?.owner || !this.options?.repo) {
      this.postError = 'Missing owner/repo — cannot post comment.';
      return;
    }
    const issueNumber = this.issueData?.number;
    if (issueNumber == null) {
      this.postError = 'No issue is associated with this page yet.';
      return;
    }
    const trimmed = this.commentText.trim();
    if (!trimmed) return;

    this.isPosting = true;
    this.postError = undefined;
    try {
      const response = await postComment({
        repo: this.options.repo,
        owner: this.options.owner,
        issue: String(issueNumber),
        comment: trimmed,
      });
      if (response.status === 201) {
        this.commentText = '';
        this.dispatchEvent(
          new CustomEvent('comment-added', {bubbles: true, composed: true})
        );
      } else {
        // Keep the user's draft so they don't lose work.
        this.postError = `Failed to post comment (HTTP ${response.status}).`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.postError = `Failed to post comment: ${msg}`;
    } finally {
      this.isPosting = false;
    }
  }
  override render() {
    return commentBoxTemplate(this);
  }
}

function generateOauthState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

declare global {
  interface HTMLElementTagNameMap {
    'comment-box': CommentBox;
  }
}
