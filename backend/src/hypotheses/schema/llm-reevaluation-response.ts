import { HypothesisStatus } from '../constants/hypothesis-status';
import { ReevaluationEvidenceKind } from '../constants/reevaluation-outcome';

export type LlmReevaluationItem = {
  hypothesisId: string;
  evidenceKind: ReevaluationEvidenceKind;
  isIndependentSource: boolean;
  summary: string;
  evidenceText: string;
  newStatus: HypothesisStatus | null;
  statusReason: string;
};

export type LlmReevaluationResponse = {
  assessments: LlmReevaluationItem[];
};
