import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalysisService } from '../analysis/analysis.service';
import { FactsService } from '../facts/facts.service';
import { HypothesisReevaluationService } from '../hypotheses/hypothesis-reevaluation.service';
import { HypothesisService } from '../hypotheses/hypothesis.service';

export type PipelineStepName =
  'extract' | 'analyze' | 'generate' | 'reevaluate';

export type PipelineStepResult = {
  step: PipelineStepName;
  ok: boolean;
  summary: string;
};

export type PipelineRunResult = {
  startedAt: string;
  finishedAt: string;
  steps: PipelineStepResult[];
};

/**
 * 크롤 성공 기사 → 사실 추출 → 관계·검증 → 가설 생성 → 새 기사 재평가를 한 번에 돈다.
 * 한 단계가 실패해도(예: 미사용 사실 부족) 다음 단계는 계속 시도한다.
 */
@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);
  private readonly extractLimit: number;
  private readonly reevaluateLimit: number;

  constructor(
    private readonly factsService: FactsService,
    private readonly analysisService: AnalysisService,
    private readonly hypothesisService: HypothesisService,
    private readonly reevaluationService: HypothesisReevaluationService,
    configService: ConfigService,
  ) {
    this.extractLimit =
      configService.get<number>('pipeline.extractLimit') ?? 10;
    this.reevaluateLimit =
      configService.get<number>('pipeline.reevaluateLimit') ?? 10;
  }

  async run(): Promise<PipelineRunResult> {
    const startedAt = new Date().toISOString();
    const steps: PipelineStepResult[] = [];
    let extractedArticleIds: string[] = [];

    steps.push(
      await this.step('extract', async () => {
        const batch = await this.factsService.extractPendingBatch(
          this.extractLimit,
        );

        extractedArticleIds = [];

        for (const item of batch.results) {
          if (!item.reusedExisting && item.run.status === 'completed') {
            extractedArticleIds.push(item.run.articleId);
          }
        }

        return `기사 ${batch.attempted}건 시도, 추출 ${batch.extracted}건, 실패 ${batch.failed}건`;
      }),
    );

    steps.push(
      await this.step('analyze', async () => {
        const result = await this.analysisService.runAnalysis(undefined, false);

        return result.reusedExisting
          ? '새로 분석할 사실 없음(이전 결과 재사용)'
          : `검증 ${result.verifications.length}건 / 관계 ${result.relations.length}건`;
      }),
    );

    steps.push(
      await this.step('generate', async () => {
        const result = await this.hypothesisService.generate(undefined, false);

        return result.reusedExisting
          ? '새로 쓸 사실 없음(이전 결과 재사용)'
          : `가설 ${result.hypotheses.length}건 생성`;
      }),
    );

    steps.push(
      await this.step('reevaluate', async () => {
        const targets = extractedArticleIds.slice(0, this.reevaluateLimit);
        let assessed = 0;
        let failed = 0;

        for (const articleId of targets) {
          try {
            const result = await this.reevaluationService.reevaluateForArticle(
              articleId,
              false,
            );

            assessed += result.assessments.length;
          } catch (error) {
            failed += 1;
            this.logger.warn(
              `Reevaluation failed for ${articleId}: ${errorMessage(error)}`,
            );
          }
        }

        return `새 기사 ${targets.length}건으로 재평가 ${assessed}건, 실패 ${failed}건`;
      }),
    );

    return { startedAt, finishedAt: new Date().toISOString(), steps };
  }

  private async step(
    step: PipelineStepName,
    work: () => Promise<string>,
  ): Promise<PipelineStepResult> {
    try {
      const summary = await work();
      this.logger.log(`Pipeline ${step}: ${summary}`);

      return { step, ok: true, summary };
    } catch (error) {
      const message = errorMessage(error);
      this.logger.warn(`Pipeline ${step} skipped: ${message}`);

      return { step, ok: false, summary: message };
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
