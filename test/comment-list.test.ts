import {expect, fixture, html} from '@open-wc/testing';
import '../src/components/comment-list/comment-list.js';
import type {CommentList} from '../src/components/comment-list/comment-list.js';

function makeComment(overrides: Partial<GitHubComment> = {}): GitHubComment {
  return {
    id: 1,
    node_id: 'n',
    url: '',
    html_url: '',
    body: 'hello',
    user: {
      login: 'alice',
      id: 1,
      node_id: 'u',
      avatar_url: 'https://example.com/a.png',
      gravatar_id: '',
      url: '',
      html_url: 'https://github.com/alice',
      followers_url: '',
      following_url: '',
      gists_url: '',
      starred_url: '',
      subscriptions_url: '',
      organizations_url: '',
      repos_url: '',
      events_url: '',
      received_events_url: '',
      type: 'User',
      user_view_type: 'public',
      site_admin: false,
      name: '',
      company: null,
      blog: '',
      location: '',
      email: '',
      hireable: null,
      bio: '',
      twitter_username: null,
      notification_email: '',
      public_repos: 0,
      public_gists: 0,
      followers: 0,
      following: 0,
      created_at: '',
      updated_at: '',
    },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    author_association: 'NONE',
    ...overrides,
  };
}

suite('<comment-list>', () => {
  test('renders the empty state when no comments', async () => {
    const el = await fixture<CommentList>(html`<comment-list></comment-list>`);
    const root = el.shadowRoot!;
    expect(root.querySelector('.no-comments')).to.exist;
    expect(root.querySelector('.comment-count')).to.not.exist;
  });

  test('renders pluralized comment count when many', async () => {
    const el = await fixture<CommentList>(
      html`<comment-list .comments=${[makeComment(), makeComment({id: 2})]}></comment-list>`
    );
    const count = el.shadowRoot!.querySelector('.comment-count')!;
    expect(count.textContent).to.match(/2\s+comments/);
  });

  test('renders singular when exactly one comment', async () => {
    const el = await fixture<CommentList>(
      html`<comment-list .comments=${[makeComment()]}></comment-list>`
    );
    const count = el.shadowRoot!.querySelector('.comment-count')!;
    expect(count.textContent).to.match(/1\s+comment(?!s)/);
  });

  test('renders the user as a link to their GitHub profile', async () => {
    const el = await fixture<CommentList>(
      html`<comment-list .comments=${[makeComment()]}></comment-list>`
    );
    const link = el.shadowRoot!.querySelector('a.username') as HTMLAnchorElement;
    expect(link).to.exist;
    expect(link.href).to.equal('https://github.com/alice');
    expect(link.rel).to.include('noopener');
    expect(link.target).to.equal('_blank');
  });

  test('falls back to a span (and "ghost" name) when user is null', async () => {
    const el = await fixture<CommentList>(
      html`<comment-list
        .comments=${[makeComment({user: null})]}
      ></comment-list>`
    );
    const root = el.shadowRoot!;
    expect(root.querySelector('a.username')).to.not.exist;
    expect(root.querySelector('span.username')!.textContent).to.equal('ghost');
    const img = root.querySelector('img.avatar') as HTMLImageElement;
    expect(img.src).to.include('avatars.githubusercontent.com');
  });

  test('renders comment body text', async () => {
    const el = await fixture<CommentList>(
      html`<comment-list
        .comments=${[makeComment({body: 'a particular phrase'})]}
      ></comment-list>`
    );
    expect(el.shadowRoot!.querySelector('.text')!.textContent).to.include(
      'a particular phrase'
    );
  });

  test('renders a <time> element with datetime when timestamp is present', async () => {
    const el = await fixture<CommentList>(
      html`<comment-list .comments=${[makeComment()]}></comment-list>`
    );
    const time = el.shadowRoot!.querySelector('time') as HTMLTimeElement;
    expect(time).to.exist;
    expect(time.dateTime).to.equal('2024-01-15T10:00:00Z');
  });

  test('omits <time> when created_at is missing', async () => {
    const el = await fixture<CommentList>(
      html`<comment-list
        .comments=${[makeComment({created_at: ''})]}
      ></comment-list>`
    );
    expect(el.shadowRoot!.querySelector('time')).to.not.exist;
  });
});
