import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { FactRelationEntity } from '../analysis/entities/fact-relation.entity';
import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../llm/llm-provider';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { HypothesisGenerationRunEntity } from './entities/hypothesis-generation-run.entity';
import { HypothesisStatusHistoryEntity } from './entities/hypothesis-status-history.entity';
import { HypothesisEntity } from './entities/hypothesis.entity';
import { HypothesisService } from './hypothesis.service';

class FakeLlmProvider implements LlmProvider {
  constructor(private readonly content: string) {}

  complete(_request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    return Promise.resolve({ content: this.content, model: 'fake-model' });
  }
}

function createFact(
  id: string,
  articleId: string,
  statement: string,
): ExtractedFactEntity {
  const fact = new ExtractedFactEntity();
  fact.id = id;
  fact.articleId = articleId;
  fact.normalizedStatement = statement;
  fact.originalExpression = statement;
  fact.entities = ['삼성전자'];
  fact.eventType = 'investment_contract';
  fact.sourceUrl = `https://example.com/${articleId}`;
  fact.evidenceSentence = statement;
  fact.factType = 'official_announcement';
  fact.isClaim = false;
  fact.reviewStatus = 'accepted';
  fact.extractedAt = new Date();
  return fact;
}

function createArticle(id: string): NewsArticleEntity {
  const article = new NewsArticleEntity();
  article.id = id;
  article.url = `https://example.com/${id}`;
  article.title = `기사 ${id}`;
  article.publisher = '언론';
  article.source = 'naver';
  return article;
}

describe('HypothesisService', () => {
  it('persists a hypothesis with status history and detail links', async () => {
    const facts = [
      createFact('f1', 'a1', '삼성전자가 대규모 투자를 발표했다'),
      createFact('f2', 'a2', '관련 장비 주문이 늘었다'),
    ];
    const articles = [createArticle('a1'), createArticle('a2')];
    const relation = new FactRelationEntity();
    relation.id = 'r1';
    relation.factIdA = 'f1';
    relation.factIdB = 'f2';
    relation.relationType = 'investment_capacity_change';
    relation.description = '투자와 장비 주문';
    relation.rationale = '동일 공급망 후보';
    relation.sourceRefs = ['https://example.com/a1'];
    relation.isDirectlyConfirmed = false;
    relation.isInferred = true;
    relation.uncertainty = 'medium';
    relation.alternativeExplanations = '다른 수요';
    relation.analyzedAt = new Date();

    const savedHypotheses: HypothesisEntity[] = [];
    const savedHistories: HypothesisStatusHistoryEntity[] = [];
    const savedRuns: HypothesisGenerationRunEntity[] = [];

    const service = new HypothesisService(
      {
        find: () => Promise.resolve(facts),
        findOne: ({ where }: { where: { id: string } }) =>
          Promise.resolve(facts.find((item) => item.id === where.id) ?? null),
      } as unknown as Repository<ExtractedFactEntity>,
      {
        find: () => Promise.resolve(articles),
      } as unknown as Repository<NewsArticleEntity>,
      {
        find: () => Promise.resolve([relation]),
      } as unknown as Repository<FactRelationEntity>,
      {
        find: ({ where }: { where?: { generationRunId?: string; id?: { _value?: string[] } | string } }) => {
          if (where?.generationRunId !== undefined) {
            return Promise.resolve(
              savedHypotheses.filter(
                (item) => item.generationRunId === where.generationRunId,
              ),
            );
          }

          return Promise.resolve(savedHypotheses);
        },
        findOne: ({ where }: { where: { id: string } }) =>
          Promise.resolve(
            savedHypotheses.find((item) => item.id === where.id) ?? null,
          ),
        create: (input: Partial<HypothesisEntity>) => {
          const entity = new HypothesisEntity();
          Object.assign(entity, input);
          entity.id = `h-${savedHypotheses.length + 1}`;
          return entity;
        },
        save: (entity: HypothesisEntity) => {
          savedHypotheses.push(entity);
          return Promise.resolve(entity);
        },
        delete: () => Promise.resolve({ affected: 0, raw: [] }),
      } as unknown as Repository<HypothesisEntity>,
      {
        find: () => Promise.resolve(savedHistories),
        create: (input: Partial<HypothesisStatusHistoryEntity>) => {
          const entity = new HypothesisStatusHistoryEntity();
          Object.assign(entity, input);
          entity.id = `hs-${savedHistories.length + 1}`;
          return entity;
        },
        save: (entity: HypothesisStatusHistoryEntity) => {
          savedHistories.push(entity);
          return Promise.resolve(entity);
        },
        delete: () => Promise.resolve({ affected: 0, raw: [] }),
      } as unknown as Repository<HypothesisStatusHistoryEntity>,
      {
        findOne: () => Promise.resolve(null),
        find: () => Promise.resolve([]),
        create: (input: Partial<HypothesisGenerationRunEntity>) => {
          const entity = new HypothesisGenerationRunEntity();
          Object.assign(entity, input);
          entity.id = `hr-${savedRuns.length + 1}`;
          return entity;
        },
        save: (entity: HypothesisGenerationRunEntity) => {
          const index = savedRuns.findIndex((item) => item.id === entity.id);
          if (index >= 0) {
            savedRuns[index] = entity;
          } else {
            savedRuns.push(entity);
          }
          return Promise.resolve(entity);
        },
      } as unknown as Repository<HypothesisGenerationRunEntity>,
      new FakeLlmProvider(
        JSON.stringify({
          hypotheses: [
            {
              title: '투자와 장비 수요 연결 가설',
              coreClaim:
                '대규모 투자가 장비 수요 증가로 이어졌을 가능성이 있다',
              derivationProcess:
                '투자 발표 사실과 장비 주문 증가 사실을 산업적으로 연결',
              relatedFactIds: ['f1', 'f2'],
              relatedRelationIds: ['r1'],
              supportingEvidence: [
                '삼성전자가 대규모 투자를 발표했다',
                '관련 장비 주문이 늘었다',
              ],
              contradictingEvidence: [
                '장비 주문은 다른 고객사 수요일 수 있다',
              ],
              alternativeExplanations: ['기존 설비 교체 사이클'],
              assumptions: ['동일 공정 라인'],
              uncertaintyAndLimits: '인과관계는 아직 확인되지 않았다',
              additionalVerificationItems: ['발주처 공시 확인'],
              relatedArticleUrls: [
                'https://example.com/a1',
                'https://example.com/a2',
              ],
              factsVersusInference:
                '투자 발표와 주문 증가는 사실, 연결은 추론',
              status: 'exploring',
              statusReason: '초기 탐색 단계',
            },
          ],
        }),
      ),
      new ConfigService({
        llm: { temperature: 0 },
        hypotheses: { maxFactsPerRun: 40 },
      }),
    );

    const generated = await service.generate(['f1', 'f2'], false);
    expect(generated.hypotheses).toHaveLength(1);
    expect(generated.run.status).toBe('completed');
    expect(savedHistories).toHaveLength(1);

    const detail = await service.getDetail(generated.hypotheses[0]!.id);
    expect(detail.relatedFacts).toHaveLength(2);
    expect(detail.relatedArticles).toHaveLength(2);
    expect(detail.hypothesis.contradictingEvidence[0]).toContain('다른 고객사');
    expect(detail.statusHistory[0]?.reason).toContain('초기 탐색');
  });
});
