import { ExtractedFactEntity } from '../../facts/entities/extracted-fact.entity';
import { NewsArticleEntity } from '../../news/entities/news-article.entity';
import {
  buildCandidatePairs,
  looksLikeRepublishedRelease,
} from './fact-candidate.util';

function makeFact(
  id: string,
  articleId: string,
  statement: string,
  evidence: string,
  entities: string[],
): ExtractedFactEntity {
  const fact = new ExtractedFactEntity();
  fact.id = id;
  fact.articleId = articleId;
  fact.normalizedStatement = statement;
  fact.evidenceSentence = evidence;
  fact.entities = entities;
  fact.eventType = 'investment_contract';
  return fact;
}

function makeArticle(
  id: string,
  bodyHash: string | null,
): NewsArticleEntity {
  const article = new NewsArticleEntity();
  article.id = id;
  article.bodyHash = bodyHash;
  article.publisher = '언론A';
  return article;
}

describe('fact-candidate.util', () => {
  it('detects republished releases by identical body hash', () => {
    const left = {
      fact: makeFact('f1', 'a1', '투자 발표', '투자 발표했다', ['삼성']),
      article: makeArticle('a1', 'hash-1'),
    };
    const right = {
      fact: makeFact('f2', 'a2', '투자 발표', '투자 발표했다', ['삼성']),
      article: makeArticle('a2', 'hash-1'),
    };

    expect(looksLikeRepublishedRelease(left, right)).toBe(true);
  });

  it('builds candidate pairs from overlapping entities', () => {
    const items = [
      {
        fact: makeFact('f1', 'a1', 'A 발표', 'A 발표', ['삼성전자']),
        article: makeArticle('a1', 'h1'),
      },
      {
        fact: makeFact('f2', 'a2', 'B 투자', 'B 투자', ['삼성전자']),
        article: makeArticle('a2', 'h2'),
      },
      {
        fact: makeFact('f3', 'a3', 'C 정책', 'C 정책', ['정부']),
        article: makeArticle('a3', 'h3'),
      },
    ];

    const pairs = buildCandidatePairs(items);
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    expect(
      pairs.some(
        ([left, right]) =>
          left.fact.id === 'f1' && right.fact.id === 'f2',
      ),
    ).toBe(true);
  });
});
