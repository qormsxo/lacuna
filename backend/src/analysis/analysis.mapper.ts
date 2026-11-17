import {
  AnalysisRunDto,
  FactRelationDto,
  FactVerificationDto,
} from './dto/analysis.dto';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { FactRelationEntity } from './entities/fact-relation.entity';
import { FactVerificationEntity } from './entities/fact-verification.entity';

export function toFactVerificationDto(
  item: FactVerificationEntity,
): FactVerificationDto {
  return {
    id: item.id,
    factId: item.factId,
    analysisRunId: item.analysisRunId,
    verificationStatus: item.verificationStatus,
    sourceQuality: item.sourceQuality,
    sourceIndependence: item.sourceIndependence,
    evidenceDirectness: item.evidenceDirectness,
    comparisonSummary: item.comparisonSummary,
    comparedFactIds: item.comparedFactIds,
    citedPrimarySources: item.citedPrimarySources,
    contentAgreement: item.contentAgreement,
    partialAgreement: item.partialAgreement,
    contradictionFound: item.contradictionFound,
    countsAsIndependentEvidence: item.countsAsIndependentEvidence,
    analyzedAt: item.analyzedAt.toISOString(),
  };
}

export function toFactRelationDto(item: FactRelationEntity): FactRelationDto {
  return {
    id: item.id,
    analysisRunId: item.analysisRunId,
    relationType: item.relationType,
    factIdA: item.factIdA,
    factIdB: item.factIdB,
    description: item.description,
    rationale: item.rationale,
    sourceRefs: item.sourceRefs,
    isDirectlyConfirmed: item.isDirectlyConfirmed,
    isInferred: item.isInferred,
    uncertainty: item.uncertainty,
    alternativeExplanations: item.alternativeExplanations,
    analyzedAt: item.analyzedAt.toISOString(),
  };
}

export function toAnalysisRunDto(
  run: AnalysisRunEntity,
  reusedExisting: boolean,
): AnalysisRunDto {
  return {
    id: run.id,
    runType: run.runType,
    status: run.status,
    inputHash: run.inputHash,
    factIds: run.factIds,
    model: run.model,
    verificationCount: run.verificationCount,
    relationCount: run.relationCount,
    skippedWeakRelationCount: run.skippedWeakRelationCount,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    reusedExisting,
  };
}
