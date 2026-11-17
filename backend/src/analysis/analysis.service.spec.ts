import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from '../llm/llm-provider';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import { AnalysisService } from './analysis.service';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { FactRelationEntity } from './entities/fact-relation.entity';
import { FactVerificationEntity } from './entities/fact-verification.entity';

class FakeLlmProvider implements LlmProvider {
  constructor(private readonly content: string) {}

  complete(_request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    return Promise.resolve({ content: this.content, model: 'fake-model' });
  }
}

function createFact(id: string, articleId: string): ExtractedFactEntity {
  const fact = new ExtractedFactEntity();
  fact.id = id;
  fact.articleId = articleId;
  fact.extractionRunId = 'run-1';
  fact.normalizedStatement = '삼성전자가 투자를 발표했다';
  fact.originalExpression = '삼성전자는 투자를 발표했다';
  fact.entities = ['삼성전자'];
  fact.eventType = 'investment_contract';
  fact.occurredAt = null;
  fact.quantityValue = null;
  fact.quantityUnit = null;
  fact.sourceUrl = `https://example.com/${articleId}`;
  fact.evidenceSentence = '삼성전자는 투자를 발표했다';
  fact.evidenceMatched = true;
  fact.factType = 'official_announcement';
  fact.isClaim = false;
  fact.reviewStatus = 'accepted';
  fact.extractedAt = new Date();
  fact.createdAt = new Date();
  return fact;
}

function createArticle(id: string, bodyHash: string): NewsArticleEntity {
  const article = new NewsArticleEntity();
  article.id = id;
  article.url = `https://example.com/${id}`;
  article.publisher = '언론';
  article.source = 'naver';
  article.bodyHash = bodyHash;
  return article;
}

describe('AnalysisService', () => {
  it('stores verification and relation with rationale', async () => {
    const facts = [createFact('f1', 'a1'), createFact('f2', 'a2')];
    const articles = [
      createArticle('a1', 'hash-a'),
      createArticle('a2', 'hash-b'),
    ];

    const savedVerifications: FactVerificationEntity[] = [];
    const savedRelations: FactRelationEntity[] = [];
    const savedRuns: AnalysisRunEntity[] = [];

    const factsRepo = {
      find: () => Promise.resolve(facts),
      findOne: ({ where }: { where: { id: string } }) =>
        Promise.resolve(facts.find((item) => item.id === where.id) ?? null),
    } as unknown as Repository<ExtractedFactEntity>;

    const articlesRepo = {
      find: () => Promise.resolve(articles),
    } as unknown as Repository<NewsArticleEntity>;

    const runsRepo = {
      findOne: () => Promise.resolve(null),
      create: (input: Partial<AnalysisRunEntity>) => {
        const entity = new AnalysisRunEntity();
        Object.assign(entity, input);
        entity.id = `analysis-${savedRuns.length + 1}`;
        return entity;
      },
      save: (entity: AnalysisRunEntity) => {
        const index = savedRuns.findIndex((item) => item.id === entity.id);
        if (index >= 0) {
          savedRuns[index] = entity;
        } else {
          savedRuns.push(entity);
        }
        return Promise.resolve(entity);
      },
    } as unknown as Repository<AnalysisRunEntity>;

    const verificationsRepo = {
      find: () => Promise.resolve(savedVerifications),
      create: (input: Partial<FactVerificationEntity>) => {
        const entity = new FactVerificationEntity();
        Object.assign(entity, input);
        entity.id = `v-${savedVerifications.length + 1}`;
        return entity;
      },
      save: (entity: FactVerificationEntity) => {
        savedVerifications.push(entity);
        return Promise.resolve(entity);
      },
      delete: () => Promise.resolve({ affected: 0, raw: [] }),
    } as unknown as Repository<FactVerificationEntity>;

    const relationsRepo = {
      find: () => Promise.resolve(savedRelations),
      create: (input: Partial<FactRelationEntity>) => {
        const entity = new FactRelationEntity();
        Object.assign(entity, input);
        entity.id = `r-${savedRelations.length + 1}`;
        return entity;
      },
      save: (entity: FactRelationEntity) => {
        savedRelations.push(entity);
        return Promise.resolve(entity);
      },
      createQueryBuilder: () => ({
        delete: () => ({
          where: () => ({
            execute: () => Promise.resolve({ affected: 0 }),
          }),
        }),
      }),
    } as unknown as Repository<FactRelationEntity>;

    const llmPayload = JSON.stringify({
      verifications: [
        {
          factId: 'f1',
          verificationStatus: 'partially_confirmed',
          sourceQuality: 'medium',
          sourceIndependence: 'independent',
          evidenceDirectness: 'direct',
          comparisonSummary: '다른 기사와 부분 일치',
          comparedFactIds: ['f2'],
          citedPrimarySources: ['기업 공시'],
          contentAgreement: false,
          partialAgreement: true,
          contradictionFound: false,
          countsAsIndependentEvidence: true,
        },
        {
          factId: 'f2',
          verificationStatus: 'single_source',
          sourceQuality: 'medium',
          sourceIndependence: 'independent',
          evidenceDirectness: 'direct',
          comparisonSummary: '단독 보도',
          comparedFactIds: ['f1'],
          citedPrimarySources: [],
          contentAgreement: false,
          partialAgreement: true,
          contradictionFound: false,
          countsAsIndependentEvidence: true,
        },
      ],
      relations: [
        {
          relationType: 'same_organization',
          factIdA: 'f1',
          factIdB: 'f2',
          description: '동일 기업에 대한 사실',
          rationale: '두 사실 모두 삼성전자를 주체로 명시한다',
          sourceRefs: ['https://example.com/a1', 'https://example.com/a2'],
          isDirectlyConfirmed: true,
          isInferred: false,
          uncertainty: 'low',
          alternativeExplanations: null,
        },
        {
          relationType: 'investment_capacity_change',
          factIdA: 'f1',
          factIdB: 'f2',
          description: '약한 추론',
          rationale: '키워드',
          sourceRefs: [],
          isDirectlyConfirmed: false,
          isInferred: true,
          uncertainty: 'high',
          alternativeExplanations: null,
        },
      ],
    });

    const service = new AnalysisService(
      factsRepo,
      articlesRepo,
      runsRepo,
      verificationsRepo,
      relationsRepo,
      new FakeLlmProvider(llmPayload),
      new ConfigService({
        llm: { temperature: 0 },
        analysis: { maxFactsPerRun: 40 },
      }),
    );

    const result = await service.runAnalysis(['f1', 'f2'], false);

    expect(result.run.status).toBe('completed');
    expect(result.verifications).toHaveLength(2);
    expect(result.relations).toHaveLength(1);
    expect(result.relations[0]?.rationale).toContain('삼성전자');
    expect(result.run.skippedWeakRelationCount).toBe(1);
  });
});
