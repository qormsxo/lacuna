import { ExtractedFactDto, FactExtractionRunDto } from './dto/fact.dto';
import { ExtractedFactEntity } from './entities/extracted-fact.entity';
import { FactExtractionRunEntity } from './entities/fact-extraction-run.entity';

export function toExtractedFactDto(
  fact: ExtractedFactEntity,
): ExtractedFactDto {
  return {
    id: fact.id,
    articleId: fact.articleId,
    extractionRunId: fact.extractionRunId,
    normalizedStatement: fact.normalizedStatement,
    originalExpression: fact.originalExpression,
    entities: fact.entities,
    eventType: fact.eventType,
    occurredAt: fact.occurredAt,
    quantityValue: fact.quantityValue,
    quantityUnit: fact.quantityUnit,
    sourceUrl: fact.sourceUrl,
    evidenceSentence: fact.evidenceSentence,
    evidenceMatched: fact.evidenceMatched,
    factType: fact.factType,
    isClaim: fact.isClaim,
    reviewStatus: fact.reviewStatus,
    extractedAt: fact.extractedAt.toISOString(),
  };
}

export function toFactExtractionRunDto(
  run: FactExtractionRunEntity,
  reusedExisting: boolean,
): FactExtractionRunDto {
  return {
    id: run.id,
    articleId: run.articleId,
    bodyHash: run.bodyHash,
    status: run.status,
    model: run.model,
    acceptedCount: run.acceptedCount,
    reviewCount: run.reviewCount,
    excludedCount: run.excludedCount,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    reusedExisting,
  };
}
