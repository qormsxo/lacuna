import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  toAnalysisRunDto,
  toFactRelationDto,
  toFactVerificationDto,
} from './analysis.mapper';
import type { BackgroundAccepted } from '../tasks/background';
import {
  isBackgroundRequested,
  runMaybeInBackground,
} from '../tasks/background';
import { TaskRunnerService } from '../tasks/task-runner.service';
import { parseOffset } from '../common/utils/pagination';
import { AnalysisService } from './analysis.service';
import type { FactSummary } from './analysis.service';
import { isRelationType } from './constants/relation-types';
import {
  AnalysisResultDto,
  FactRelationDto,
  FactVerificationDto,
  RelationFactSummaryDto,
  RelationListDto,
  VerificationListDto,
} from './dto/analysis.dto';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { FactRelationEntity } from './entities/fact-relation.entity';
import { FactVerificationEntity } from './entities/fact-verification.entity';

@ApiTags('analysis')
@Controller({ path: 'analysis', version: '1' })
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly taskRunner: TaskRunnerService,
  ) {}

  @Post('run')
  @ApiOperation({
    summary:
      'Run source verification and relation analysis across extracted facts',
  })
  @ApiQuery({
    name: 'factIds',
    required: false,
    example: 'uuid1,uuid2',
    description: 'Comma-separated fact IDs. Defaults to recent accepted facts.',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    example: 'false',
  })
  @ApiQuery({
    name: 'background',
    required: false,
    example: 'true',
    description: 'true면 즉시 taskId를 반환하고 /tasks/:id로 결과를 조회',
  })
  @ApiOkResponse({ type: AnalysisResultDto })
  async run(
    @Query('factIds') factIdsRaw?: string,
    @Query('force') forceRaw?: string,
    @Query('background') backgroundRaw?: string,
  ): Promise<AnalysisResultDto | BackgroundAccepted> {
    const factIds = this.parseFactIds(factIdsRaw);
    const force = forceRaw === 'true' || forceRaw === '1';

    return runMaybeInBackground(
      this.taskRunner,
      isBackgroundRequested(backgroundRaw),
      'analysis.run',
      async (): Promise<AnalysisResultDto> => {
        const result = await this.analysisService.runAnalysis(factIds, force);

        return this.toResultDto(
          result.run,
          result.verifications,
          result.relations,
          result.reusedExisting,
        );
      },
    );
  }

  @Get('runs/:id')
  @ApiOperation({
    summary: 'Get one analysis run with verifications and relations',
  })
  @ApiOkResponse({ type: AnalysisResultDto })
  async getRun(@Param('id') id: string): Promise<AnalysisResultDto> {
    const result = await this.analysisService.getRun(id);

    return this.toResultDto(
      result.run,
      result.verifications,
      result.relations,
      result.reusedExisting,
    );
  }

  @Get('verifications')
  @ApiOperation({ summary: 'List verifications for a fact' })
  @ApiQuery({ name: 'factId', required: true })
  @ApiOkResponse({ type: VerificationListDto })
  async listVerifications(
    @Query('factId') factId?: string,
  ): Promise<VerificationListDto> {
    if (factId === undefined || factId.trim().length === 0) {
      throw new BadRequestException('factId is required');
    }

    const rows = await this.analysisService.listVerificationsByFact(factId);
    const verifications: FactVerificationDto[] = [];

    for (const row of rows) {
      verifications.push(toFactVerificationDto(row));
    }

    return { verifications };
  }

  @Get('verifications/:id')
  @ApiOperation({ summary: 'Get one verification record' })
  @ApiOkResponse({ type: FactVerificationDto })
  async getVerification(@Param('id') id: string): Promise<FactVerificationDto> {
    const item = await this.analysisService.getVerification(id);

    return toFactVerificationDto(item);
  }

  @Get('relations')
  @ApiOperation({
    summary:
      'List relations. Provide factId for one fact, or omit to list recent relations.',
  })
  @ApiQuery({ name: 'factId', required: false })
  @ApiQuery({ name: 'limit', required: false, example: '50' })
  @ApiQuery({ name: 'offset', required: false, example: '0' })
  @ApiQuery({ name: 'relationType', required: false })
  @ApiOkResponse({ type: RelationListDto })
  async listRelations(
    @Query('factId') factId?: string,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
    @Query('relationType') relationTypeRaw?: string,
  ): Promise<RelationListDto> {
    let rows: FactRelationEntity[];
    let total: number;

    if (factId !== undefined && factId.trim().length > 0) {
      rows = await this.analysisService.listRelationsByFact(factId);
      total = rows.length;
    } else {
      const relationType =
        relationTypeRaw === undefined || relationTypeRaw.trim().length === 0
          ? undefined
          : relationTypeRaw.trim();

      if (relationType !== undefined && !isRelationType(relationType)) {
        throw new BadRequestException(
          `Unsupported relationType: ${relationType}`,
        );
      }

      const page = await this.analysisService.listRelationsPaged({
        limit: this.parseLimit(limitRaw, 50),
        offset: parseOffset(offsetRaw),
        relationType,
      });
      rows = page.rows;
      total = page.total;
    }

    const factIds: string[] = [];

    for (const row of rows) {
      factIds.push(row.factIdA, row.factIdB);
    }

    const summaries = await this.analysisService.loadFactSummaries(factIds);
    const relations: FactRelationDto[] = [];

    for (const row of rows) {
      relations.push({
        ...toFactRelationDto(row),
        factA: toSummaryDto(summaries.get(row.factIdA)),
        factB: toSummaryDto(summaries.get(row.factIdB)),
      });
    }

    return { relations, total };
  }

  @Get('relations/:id')
  @ApiOperation({ summary: 'Get one relation record' })
  @ApiOkResponse({ type: FactRelationDto })
  async getRelation(@Param('id') id: string): Promise<FactRelationDto> {
    const item = await this.analysisService.getRelation(id);

    return toFactRelationDto(item);
  }

  private parseLimit(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw.trim().length === 0) {
      return fallback;
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value <= 0 || value > 100) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 100',
      );
    }

    return value;
  }

  private parseFactIds(raw: string | undefined): string[] | undefined {
    if (raw === undefined || raw.trim().length === 0) {
      return undefined;
    }

    const parts = raw.split(',');
    const ids: string[] = [];

    for (const part of parts) {
      const value = part.trim();

      if (value.length === 0) {
        continue;
      }

      if (!ids.includes(value)) {
        ids.push(value);
      }
    }

    if (ids.length === 0) {
      throw new BadRequestException('factIds must include at least one id');
    }

    return ids;
  }

  private toResultDto(
    run: AnalysisRunEntity,
    verifications: FactVerificationEntity[],
    relations: FactRelationEntity[],
    reusedExisting: boolean,
  ): AnalysisResultDto {
    const verificationDtos: FactVerificationDto[] = [];
    const relationDtos: FactRelationDto[] = [];

    for (const item of verifications) {
      verificationDtos.push(toFactVerificationDto(item));
    }

    for (const item of relations) {
      relationDtos.push(toFactRelationDto(item));
    }

    return {
      run: toAnalysisRunDto(run, reusedExisting),
      verifications: verificationDtos,
      relations: relationDtos,
    };
  }
}

function toSummaryDto(
  summary: FactSummary | undefined,
): RelationFactSummaryDto | null {
  return summary === undefined ? null : { ...summary };
}
