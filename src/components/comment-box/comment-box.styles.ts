import {css} from 'lit';

export const commentBoxStyles = css`
  .comment-container {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    margin: 40px auto 10px;
  }

  /* Avatar */
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  /* Comment box */
  .comment-box {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .comment-textarea {
    min-height: 60px;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 14px;
    color: #333;
    resize: none;
  }
  .comment-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  /* Footer row */
  .comment-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
  }

  /* Markdown hint */
  .markdown-hint {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #2563eb;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
  }
  .markdown-hint svg {
    width: 16px;
    height: 16px;
    margin-right: 4px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
  }

  /* Buttons */
  .btn-group {
    display: flex;
    gap: 8px;
  }
  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .btn-login-with-github {
    background: #ffffff;
    color: #24292f; /* GitHub ink */
    border-color: #24292f22; /* subtle border */
  }

  .btn-login-with-github:hover {
    background: #f6f8fa; /* GitHub canvas-subtle */
    border-color: #24292f55;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05), 0 2px 6px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }
  .btn-login-with-github:active {
    background: #eef1f4;
    border-color: #24292f66;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) inset;
    transform: translateY(0);
  }
  .btn-login-with-github:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.35),
      /* GH blue ring */ 0 1px 1px rgba(0, 0, 0, 0.05),
      0 2px 6px rgba(0, 0, 0, 0.06);
    border-color: #0969da; /* GH blue */
  }
  .btn-login-with-github:disabled,
  .btn-login-with-github[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .btn-preview:hover {
    background: #f0f9ff;
  }
  .btn-comment {
    background: #2563eb;
    color: #fff;
  }
  .btn-comment:hover {
    background: #1e40af;
  }
`;
