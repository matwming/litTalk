import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {DEFAULT_GITHUB_AVATAR_URL} from '../../constant';

@customElement('comment-list')
export class CommentList extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: sans-serif;
    }
    .comment-container {
      display: flex;
      align-items: flex-start;
      flex-direction: column;
      padding: 12px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      max-width: 600px;
      margin: 10px auto;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      object-fit: cover;
      margin-right: 12px;
    }
    .content {
      flex: 1;
      background: #f9f9f9;
      padding: 5px;
    }
    .meta {
      font-size: 14px;
      color: #999;
    }
    .username {
      font-weight: bold;
      color: #4183c4;
      text-decoration: none;
      margin-right: 4px;
    }
    .text {
      font-size: 16px;
      color: #333;
      margin: 4px 0 8px 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .actions {
      font-size: 14px;
      color: #4183c4;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .icon {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .comment-section {
      display: flex;
      flex-direction: row;
      margin-bottom: 12px;
      padding: 5px;
      width: 100%;
    }
    .comment-count {
      color: #4183c4;
      margin-bottom: 1rem;
    }
  `;

  @property({type: Array})
  comments: GitHubComment[] = [];

  override render() {
    return html`
      <div class="comment-container">
        ${this.comments.length > 0
          ? html`<div class="comment-count">
              ${this.comments.length}
              ${this.comments.length === 1 ? 'comment' : 'comments'}
            </div>`
          : html``}
        ${this.comments.length === 0
          ? html`<p class="no-comments">No comments yet.</p>`
          : html`
              ${this.comments.map((comment) => {
                const login = comment.user?.login ?? 'ghost';
                const avatar =
                  comment.user?.avatar_url ?? DEFAULT_GITHUB_AVATAR_URL;
                const userUrl = comment.user?.html_url;
                const createdAt = comment.created_at
                  ? new Date(comment.created_at)
                  : undefined;
                return html`
                  <div class="comment-section">
                    <img class="avatar" src=${avatar} alt=${login} />
                    <div class="content">
                      <div class="meta">
                        ${userUrl
                          ? html`<a
                              class="username"
                              href=${userUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              >${login}</a
                            >`
                          : html`<span class="username">${login}</span>`}
                        commented
                        ${createdAt
                          ? html`<time datetime=${comment.created_at}
                              >${createdAt.toLocaleDateString()} at
                              ${createdAt.toLocaleTimeString()}</time
                            >`
                          : ''}
                      </div>
                      <div class="text">${comment.body}</div>
                    </div>
                  </div>
                `;
              })}
            `}
      </div>
    `;
  }
}
