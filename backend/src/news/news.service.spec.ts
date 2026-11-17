import { ArticleCollectionStore } from './articles/article-collection.store';
import { NewsCollector } from './collectors/news-collector';
import { ArticleDto } from './dto/article.dto';
import { CollectorResult } from './dto/collect-result.dto';
import { NewsService } from './news.service';

class StubCollector implements NewsCollector {
  constructor(
    readonly source: 'google' | 'naver' | 'daum',
    private readonly result: CollectorResult,
  ) {}

  collect(): Promise<CollectorResult> {
    return Promise.resolve(this.result);
  }
}

class FakeArticleCollectionStore implements ArticleCollectionStore {
  readonly saved: ArticleDto[] = [];

  upsertCollectedArticles(articles: ArticleDto[]) {
    for (const article of articles) {
      this.saved.push(article);
    }

    return Promise.resolve({
      articles: [],
      createdCount: articles.length,
      updatedCount: 0,
      duplicateCount: 0,
    });
  }
}

describe('NewsService', () => {
  it('keeps collecting when one source fails', async () => {
    const articleStore = new FakeArticleCollectionStore();

    const service = new NewsService(
      [
        new StubCollector('google', {
          status: 'failure',
          source: 'google',
          category: '정치',
          errorCode: 'TIMEOUT',
          message: 'timeout',
        }),
        new StubCollector('naver', {
          status: 'success',
          source: 'naver',
          category: '정치',
          articles: [
            {
              title: '네이버 기사',
              url: 'https://n.news.naver.com/mnews/article/001/1',
              publisher: '연합뉴스',
              publishedAt: '1분전',
              collectedAt: '2026-11-17T00:00:00.000Z',
              category: '정치',
              source: 'naver',
              summary: '요약',
            },
          ],
        }),
        new StubCollector('daum', {
          status: 'success',
          source: 'daum',
          category: '정치',
          articles: [
            {
              title: '다음 기사',
              url: 'https://v.daum.net/v/1',
              publisher: '뉴스1',
              publishedAt: '2분 전',
              collectedAt: '2026-11-17T00:00:00.000Z',
              category: '정치',
              source: 'daum',
              summary: null,
            },
          ],
        }),
      ],
      articleStore,
    );

    const result = await service.collect('정치', ['google', 'naver', 'daum']);

    expect(result.summary.successCount).toBe(2);
    expect(result.summary.failureCount).toBe(1);
    expect(result.summary.createdCount).toBe(2);
    expect(result.failures[0]?.source).toBe('google');
    expect(result.articles).toHaveLength(2);
    expect(articleStore.saved).toHaveLength(2);
  });
});
