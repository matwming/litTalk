import {html} from 'lit';
import {DEFAULT_GITHUB_AVATAR_URL} from '../../constant';
import type {CommentBox} from './comment-box';

export const commentBoxTemplate = (ctx: CommentBox) => {
  const loggedIn = Boolean(ctx.githubUser?.login);
  const canPost = loggedIn && !ctx.isPosting && ctx.commentText.trim().length > 0;
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
        <label class="visually-hidden" for="lit-talk-textarea">Comment</label>
        <textarea
          id="lit-talk-textarea"
          class="comment-textarea"
          placeholder="${!loggedIn ? 'Please Login with Github' : 'Leave a comment'}"
          .value=${ctx.commentText}
          @input=${ctx._handleCommentInput}
          ?disabled=${!loggedIn || ctx.isPosting}
          aria-disabled=${!loggedIn || ctx.isPosting}
        ></textarea>

        ${ctx.postError
          ? html`<div class="post-error" role="alert">${ctx.postError}</div>`
          : ''}

        <div class="comment-footer">
          <!-- Markdown hint -->
          <button class="markdown-hint" type="button" aria-label="Markdown info">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
            Markdown will be supported soon
          </button>

          <!-- Action buttons -->
          <div class="btn-group">
            ${!loggedIn
              ? html`<button
                  class="btn btn-login-with-github"
                  type="button"
                  @click=${ctx._handleLogin}
                >
                  Login with Github
                </button>`
              : html`<button
                  class="btn btn-comment"
                  type="button"
                  ?disabled=${!canPost}
                  aria-busy=${ctx.isPosting}
                  @click=${ctx._postComment}
                >
                  ${ctx.isPosting ? 'Posting…' : 'Comment'}
                </button>`}
          </div>
        </div>
      </div>
    </div>
  `;
};
