export type DashboardSummary = {
  articleCount: number;
  articlesByCategory: Array<{ category: string; count: number }>;
  factTotal: number;
  factAccepted: number;
  factNeedsReview: number;
  relationCount: number;
  hypothesisCount: number;
  recentArticles: Array<{
    id: string;
    title: string;
    publisher: string | null;
    category: string;
    crawlStatus: string;
    collectedAt: string;
    url: string;
  }>;
  recentHypotheses: Array<{
    id: string;
    title: string;
    status: string;
    generatedAt: string;
    lastReevaluatedAt: string | null;
  }>;
  recentReevaluations: Array<{
    id: string;
    hypothesisId: string;
    evidenceKind: string;
    summary: string;
    evaluatedAt: string;
  }>;
};

export type Article = {
  id: string;
  title: string;
  publisher: string | null;
  category: string;
  source: string;
  crawlStatus: string;
  collectedAt: string;
  publishedAt: string | null;
  url: string;
  bodyExtracted: boolean;
};

export type Fact = {
  id: string;
  articleId: string;
  normalizedStatement: string;
  evidenceSentence: string;
  entities: string[];
  factType: string;
  isClaim: boolean;
  reviewStatus: string;
  sourceUrl: string;
  eventType: string;
};

export type Relation = {
  id: string;
  relationType: string;
  factIdA: string;
  factIdB: string;
  description: string;
  rationale: string;
  uncertainty: string;
  isDirectlyConfirmed: boolean;
  isInferred: boolean;
  sourceRefs: string[];
};

export type Hypothesis = {
  id: string;
  title: string;
  coreClaim: string;
  derivationProcess: string;
  relatedFactIds: string[];
  supportingEvidence: string[];
  contradictingEvidence: string[];
  alternativeExplanations: string[];
  assumptions: string[];
  uncertaintyAndLimits: string;
  additionalVerificationItems: string[];
  relatedArticleUrls: string[];
  factsVersusInference: string;
  status: string;
  generatedAt: string;
  lastReevaluatedAt: string | null;
};

export type HypothesisDetail = {
  hypothesis: Hypothesis;
  relatedFacts: Array<{
    id: string;
    articleId: string;
    normalizedStatement: string;
    evidenceSentence: string;
    sourceUrl: string;
    factType: string;
    isClaim: boolean;
    entities: string[];
  }>;
  relatedArticles: Array<{
    id: string;
    url: string;
    title: string;
    publisher: string | null;
    source: string;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string;
    evidenceRefs: string[];
    changedAt: string;
  }>;
};

export type Verification = {
  id: string;
  factId: string;
  verificationStatus: string;
  sourceQuality: string;
  sourceIndependence: string;
  comparisonSummary: string;
};
