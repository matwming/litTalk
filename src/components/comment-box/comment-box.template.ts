import {html} from 'lit';
import {DEFAULT_GITHUB_AVATAR_URL} from '../../constant';

export const commentBoxTemplate = (ctx: any) => {
  return html`
    <div class="comment-container">
      <!-- Avatar -->
      <img
        src=${ctx.githubUser?.avatar_url ?? DEFAULT_GITHUB_AVATAR_URL}
        alt=${ctx.githubUser?.login ?? 'User avatar'}
        class="avatar"
      />

      <!-- Comment box -->
      <div class="comment-box">
        <textarea
          class="comment-textarea"
          placeholder="${!ctx.githubUser?.login
            ? 'Please Login with Github'
            : 'Leave a comment'}"
          .value=${ctx.commentText}
          @input=${ctx._handleCommentInput}
          ?disabled=${!ctx.githubUser?.login}
        ></textarea>

        <div class="comment-footer">
          <!-- Markdown hint -->
          <button class="markdown-hint">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
            Markdown will be supported soon
          </button>

          <!-- Action buttons -->
          <div class="btn-group">
            ${!ctx.githubUser?.login
              ? html`<button
                  class="btn btn-login-with-github"
                  @click=${ctx._handleLogin}
                >
                  Login with Github
                </button>`
              : html`<button class="btn btn-comment" @click=${ctx._postComment}>
                  Comment
                </button>`}
          </div>
        </div>
      </div>
    </div>
  `;
};
