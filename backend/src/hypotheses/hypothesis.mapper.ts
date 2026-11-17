import { ExtractedFactEntity } from '../facts/entities/extracted-fact.entity';
import { NewsArticleEntity } from '../news/entities/news-article.entity';
import {
  HypothesisDto,
  HypothesisGenerationRunDto,
  HypothesisReevaluationDto,
  HypothesisRelatedArticleDto,
  HypothesisRelatedFactDto,
  HypothesisStatusHistoryDto,
} from './dto/hypothesis.dto';
import { HypothesisGenerationRunEntity } from './entities/hypothesis-generation-run.entity';
import { HypothesisReevaluationEntity } from './entities/hypothesis-reevaluation.entity';
import { HypothesisStatusHistoryEntity } from './entities/hypothesis-status-history.entity';
import { HypothesisEntity } from './entities/hypothesis.entity';

export function toHypothesisDto(item: HypothesisEntity): HypothesisDto {
  return {
    id: item.id,
    generationRunId: item.generationRunId,
    title: item.title,
    coreClaim: item.coreClaim,
    derivationProcess: item.derivationProcess,
    relatedFactIds: item.relatedFactIds,
    relatedRelationIds: item.relatedRelationIds,
    supportingEvidence: item.supportingEvidence,
    contradictingEvidence: item.contradictingEvidence,
    alternativeExplanations: item.alternativeExplanations,
    assumptions: item.assumptions,
    uncertaintyAndLimits: item.uncertaintyAndLimits,
    additionalVerificationItems: item.additionalVerificationItems,
    relatedArticleUrls: item.relatedArticleUrls,
    factsVersusInference: item.factsVersusInference,
    status: item.status,
    generatedAt: item.generatedAt.toISOString(),
    lastReevaluatedAt: item.lastReevaluatedAt
      ? item.lastReevaluatedAt.toISOString()
      : null,
  };
}

export function toHypothesisReevaluationDto(
  item: HypothesisReevaluationEntity,
): HypothesisReevaluationDto {
  return {
    id: item.id,
    hypothesisId: item.hypothesisId,
    sourceArticleId: item.sourceArticleId,
    evidenceKind: item.evidenceKind,
    isIndependentSource: item.isIndependentSource,
    summary: item.summary,
    evidenceText: item.evidenceText,
    previousStatus: item.previousStatus,
    nextStatus: item.nextStatus,
    statusReason: item.statusReason,
    applied: item.applied,
    evaluatedAt: item.evaluatedAt.toISOString(),
  };
}

export function toHypothesisStatusHistoryDto(
  item: HypothesisStatusHistoryEntity,
): HypothesisStatusHistoryDto {
  return {
    id: item.id,
    hypothesisId: item.hypothesisId,
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    reason: item.reason,
    evidenceRefs: item.evidenceRefs,
    changedAt: item.changedAt.toISOString(),
  };
}

export function toHypothesisRelatedFactDto(
  fact: ExtractedFactEntity,
): HypothesisRelatedFactDto {
  return {
    id: fact.id,
    articleId: fact.articleId,
    normalizedStatement: fact.normalizedStatement,
    evidenceSentence: fact.evidenceSentence,
    sourceUrl: fact.sourceUrl,
    factType: fact.factType,
    isClaim: fact.isClaim,
    entities: fact.entities,
  };
}

export function toHypothesisRelatedArticleDto(
  article: NewsArticleEntity,
): HypothesisRelatedArticleDto {
  return {
    id: article.id,
    url: article.url,
    title: article.title,
    publisher: article.publisher,
    source: article.source,
  };
}

export function toHypothesisGenerationRunDto(
  run: HypothesisGenerationRunEntity,
  reusedExisting: boolean,
): HypothesisGenerationRunDto {
  return {
    id: run.id,
    inputHash: run.inputHash,
    status: run.status,
    factIds: run.factIds,
    relationIds: run.relationIds,
    model: run.model,
    hypothesisCount: run.hypothesisCount,
    skippedCount: run.skippedCount,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    reusedExisting,
  };
}
