import { HypothesisStatus } from '../constants/hypothesis-status';

export type LlmHypothesisItem = {
  title: string;
  coreClaim: string;
  derivationProcess: string;
  relatedFactIds: string[];
  relatedRelationIds: string[];
  supportingEvidence: string[];
  contradictingEvidence: string[];
  alternativeExplanations: string[];
  assumptions: string[];
  uncertaintyAndLimits: string;
  additionalVerificationItems: string[];
  relatedArticleUrls: string[];
  factsVersusInference: string;
  status: HypothesisStatus;
  statusReason: string;
};

export type LlmHypothesisResponse = {
  hypotheses: LlmHypothesisItem[];
};
