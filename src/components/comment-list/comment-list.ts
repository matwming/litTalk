// comment-box.ts
import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';

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
  comments: any[] = [];

  override render() {
    return html`
      <div class="comment-container">
        ${this.comments.length > 0
          ? html`<div class="comment-count">
              ${this.comments.length} comments
            </div>`
          : html``}
        ${this.comments.length === 0
          ? html`<p class="no-comments">No comments yet.</p>`
          : html`
              ${this.comments.map(
                (comment: any) => html`
                  <div class="comment-section">
                    <img
                      class="avatar"
                      src=${comment.user.avatar_url}
                      alt=${comment.user.login}
                      class="avatar"
                    />
                    <div class="content">
                      <div class="meta">
                        <a class="username" href="#">${comment.user.login}</a>
                        commented
                        ${new Date(comment.created_at).toLocaleDateString()} at
                        ${new Date(comment.created_at).toLocaleTimeString()}
                      </div>
                      <div class="text">${comment.body}</div>
                      <!--              <div class="actions">-->
                      <!--                <div class="icon">❤️ <span>3</span></div>-->
                      <!--              </div>-->
                    </div>
                  </div>
                `
              )}
            `}
      </div>
    `;
  }
}
