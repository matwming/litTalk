import {LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {commentBoxStyles} from './comment-box.styles';
import {commentBoxTemplate} from './comment-box.template';
import {githubOauthUrl} from '../../github/github-apis';
import {IGitHubOauthOptions} from '../../lit-talk';
import {Effect} from 'effect';
import {postCommentEffect} from '../../effects/effects';

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

  override connectedCallback() {
    super.connectedCallback();
    console.log('comment-box', this.options);
  }

  _handleLogin() {
    const query = {
      client_id: this.options?.client_id as string,
      redirect_uri: window.location.href,
      scope: 'public_repo',
      prompt: 'consent',
    };
    console.log('query', query);
    const oauthUrl = `${githubOauthUrl}?${new URLSearchParams(query)}`;
    window.location.href = oauthUrl;
  }

  _handleCommentInput(e: InputEvent) {
    const textarea = e.target as HTMLTextAreaElement;
    this.commentText = textarea.value;
  }

  _postComment() {
    console.log('Posting comment:', this.commentText);
    Effect.runPromise(
      postCommentEffect({
        repo: this.options?.repo!,
        owner: this.options?.owner!,
        issue: String(this.issueData?.number)!,
        comment: this.commentText,
      })
    );
  }
  override render() {
    return commentBoxTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'comment-box': CommentBox;
  }
}
