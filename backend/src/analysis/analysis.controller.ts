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
import { AnalysisService } from './analysis.service';
import {
  AnalysisResultDto,
  FactRelationDto,
  FactVerificationDto,
  RelationListDto,
  VerificationListDto,
} from './dto/analysis.dto';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { FactRelationEntity } from './entities/fact-relation.entity';
import { FactVerificationEntity } from './entities/fact-verification.entity';

@ApiTags('analysis')
@Controller({ path: 'analysis', version: '1' })
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

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
  @ApiOkResponse({ type: AnalysisResultDto })
  async run(
    @Query('factIds') factIdsRaw?: string,
    @Query('force') forceRaw?: string,
  ): Promise<AnalysisResultDto> {
    const factIds = this.parseFactIds(factIdsRaw);
    const force = forceRaw === 'true' || forceRaw === '1';
    const result = await this.analysisService.runAnalysis(factIds, force);

    return this.toResultDto(
      result.run,
      result.verifications,
      result.relations,
      result.reusedExisting,
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
  async getVerification(
    @Param('id') id: string,
  ): Promise<FactVerificationDto> {
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
  @ApiOkResponse({ type: RelationListDto })
  async listRelations(
    @Query('factId') factId?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<RelationListDto> {
    const rows =
      factId !== undefined && factId.trim().length > 0
        ? await this.analysisService.listRelationsByFact(factId)
        : await this.analysisService.listRecentRelations(
            this.parseLimit(limitRaw, 50),
          );
    const relations: FactRelationDto[] = [];

    for (const row of rows) {
      relations.push(toFactRelationDto(row));
    }

    return { relations };
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
