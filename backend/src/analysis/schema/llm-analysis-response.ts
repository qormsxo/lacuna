import { EvidenceDirectness } from '../constants/evidence-directness';
import { RelationType } from '../constants/relation-types';
import { SourceIndependence } from '../constants/source-independence';
import { SourceQuality } from '../constants/source-quality';
import { UncertaintyLevel } from '../constants/uncertainty';
import { VerificationStatus } from '../constants/verification-status';

export type LlmVerificationItem = {
  factId: string;
  verificationStatus: VerificationStatus;
  sourceQuality: SourceQuality;
  sourceIndependence: SourceIndependence;
  evidenceDirectness: EvidenceDirectness;
  comparisonSummary: string;
  comparedFactIds: string[];
  citedPrimarySources: string[];
  contentAgreement: boolean;
  partialAgreement: boolean;
  contradictionFound: boolean;
  countsAsIndependentEvidence: boolean;
};

export type LlmRelationItem = {
  relationType: RelationType;
  factIdA: string;
  factIdB: string;
  description: string;
  rationale: string;
  sourceRefs: string[];
  isDirectlyConfirmed: boolean;
  isInferred: boolean;
  uncertainty: UncertaintyLevel;
  alternativeExplanations: string | null;
};

export type LlmAnalysisResponse = {
  verifications: LlmVerificationItem[];
  relations: LlmRelationItem[];
};
