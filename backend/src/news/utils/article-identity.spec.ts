import {
  buildArticleIdentity,
  buildIdentityHash,
  buildTitleHash,
} from './article-identity';

describe('article-identity', () => {
  it('builds stable title and identity hashes', () => {
    const titleHash = buildTitleHash('  같은  제목 ');
    expect(titleHash).toBe(buildTitleHash('같은 제목'));

    const identity = buildIdentityHash('같은 제목', '연합뉴스');
    expect(identity).toBe(buildIdentityHash(' 같은 제목 ', ' 연합뉴스 '));
    expect(buildIdentityHash('같은 제목', null)).toBeNull();
  });

  it('builds identity for a valid article url', () => {
    const identity = buildArticleIdentity(
      'https://n.news.naver.com/mnews/article/001/1?utm_source=rss',
      '제목',
      '연합뉴스',
    );

    expect(identity).not.toBeNull();
    expect(identity?.normalizedUrl).toBe(
      'https://n.news.naver.com/mnews/article/001/1',
    );
    expect(identity?.articleKey).toBe('naver:001:1');
    expect(identity?.titleHash).toBe(buildTitleHash('제목'));
  });
});
