import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794978606185 implements MigrationInterface {
  name = 'InitialSchema1794978606185';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "news_sources" ("id" character varying(32) NOT NULL, "name" character varying(128) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_afc653c2b8933edb29e2eb7e3fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "news_articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying(2048) NOT NULL, "normalizedUrl" character varying(2048) NOT NULL, "articleKey" character varying(128), "title" character varying(512) NOT NULL, "titleHash" character varying(64) NOT NULL, "publisher" character varying(255), "identityHash" character varying(64), "category" character varying(64) NOT NULL, "source" character varying(32) NOT NULL, "summary" text, "listPublishedAt" character varying(128), "collectedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "crawlStatus" character varying(32) NOT NULL DEFAULT 'pending', "crawlAttempts" integer NOT NULL DEFAULT '0', "nextRetryAt" TIMESTAMP WITH TIME ZONE, "crawledAt" TIMESTAMP WITH TIME ZONE, "body" text, "bodyLength" integer, "bodyHash" character varying(64), "bodyStorageMode" character varying(32) NOT NULL DEFAULT 'full', "bodyExtracted" boolean NOT NULL DEFAULT false, "isDuplicate" boolean NOT NULL DEFAULT false, "duplicateOfId" uuid, "author" character varying(255), "publishedAt" character varying(128), "modifiedAt" character varying(128), "lastError" text, "lastErrorCode" character varying(64), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ca1b67b1b6b2c382317bbd769dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b0180944d7207f4630249abd4e" ON "news_articles" ("normalizedUrl") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_027acf06cefb3f659da709e950" ON "news_articles" ("articleKey") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_96bf9f1dd5963904717b28df5d" ON "news_articles" ("titleHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_36e79bffd84efef6ef1085de3e" ON "news_articles" ("identityHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bba2c7f41e62a52461d5eb6179" ON "news_articles" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5788ba4d541bd61a227da57b8a" ON "news_articles" ("collectedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a5b7bc077402451f2f6cdf92b" ON "news_articles" ("crawlStatus") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d2b5cb66b54b6da015a649c952" ON "news_articles" ("bodyHash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "news_categories" ("id" character varying(64) NOT NULL, "name" character varying(64) NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', "enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_20eed6c3ae534e7721fa44874a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "crawl_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jobType" character varying(32) NOT NULL, "status" character varying(32) NOT NULL, "category" character varying(64), "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "finishedAt" TIMESTAMP WITH TIME ZONE, "requestedCount" integer NOT NULL DEFAULT '0', "createdCount" integer NOT NULL DEFAULT '0', "updatedCount" integer NOT NULL DEFAULT '0', "duplicateCount" integer NOT NULL DEFAULT '0', "crawledSuccess" integer NOT NULL DEFAULT '0', "crawledFailed" integer NOT NULL DEFAULT '0', "message" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8dab5efb56b8887d48dd403305e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_363229f02bac07b4ee46d8c773" ON "crawl_histories" ("jobType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c571cc551bdc7e422d609e7b03" ON "crawl_histories" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "hypotheses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "generationRunId" uuid NOT NULL, "title" character varying(512) NOT NULL, "coreClaim" text NOT NULL, "derivationProcess" text NOT NULL, "relatedFactIds" jsonb NOT NULL, "relatedRelationIds" jsonb NOT NULL, "supportingEvidence" jsonb NOT NULL, "contradictingEvidence" jsonb NOT NULL, "alternativeExplanations" jsonb NOT NULL, "assumptions" jsonb NOT NULL, "uncertaintyAndLimits" text NOT NULL, "additionalVerificationItems" jsonb NOT NULL, "relatedArticleUrls" jsonb NOT NULL, "factsVersusInference" text NOT NULL, "status" character varying(64) NOT NULL, "generatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "lastReevaluatedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0f855b385e23533e6b7bcc1ab15" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3aad6b25f4b9af3ef49427c75" ON "hypotheses" ("generationRunId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ef223bc54bd12a371030f3289" ON "hypotheses" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4b823a689cd18a1ccf8ee35e9" ON "hypotheses" ("lastReevaluatedAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "hypothesis_status_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hypothesisId" uuid NOT NULL, "fromStatus" character varying(64), "toStatus" character varying(64) NOT NULL, "reason" text NOT NULL, "evidenceRefs" jsonb NOT NULL, "changedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9ae7ca41a080ae64029b47a49ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e123fa56027458eeeb1903c91d" ON "hypothesis_status_histories" ("hypothesisId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "hypothesis_reevaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hypothesisId" uuid NOT NULL, "sourceArticleId" uuid NOT NULL, "evidenceFingerprint" character varying(64) NOT NULL, "status" character varying(32) NOT NULL, "evidenceKind" character varying(32) NOT NULL, "isIndependentSource" boolean NOT NULL DEFAULT false, "summary" text NOT NULL, "evidenceText" text, "previousStatus" character varying(64), "nextStatus" character varying(64), "statusReason" text, "applied" boolean NOT NULL DEFAULT false, "evaluatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b893aeb873812304b20d0dc15fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d2e7868d12063b6e2585866184" ON "hypothesis_reevaluations" ("hypothesisId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cff777ae86595b42225133166b" ON "hypothesis_reevaluations" ("sourceArticleId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa1ea1a55f6485dc43a0934b7d" ON "hypothesis_reevaluations" ("evidenceFingerprint") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c135fb7fc1e3f0421d22aaccc2" ON "hypothesis_reevaluations" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "hypothesis_generation_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inputHash" character varying(64) NOT NULL, "status" character varying(32) NOT NULL, "factIds" jsonb NOT NULL, "relationIds" jsonb NOT NULL, "model" character varying(128), "hypothesisCount" integer NOT NULL DEFAULT '0', "skippedCount" integer NOT NULL DEFAULT '0', "errorMessage" text, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "finishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_46207a76354368f062cc1c4a974" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d9449281432f2337d80d5552bf" ON "hypothesis_generation_runs" ("inputHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3504ae038c845edaa1394dd022" ON "hypothesis_generation_runs" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fact_extraction_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "articleId" uuid NOT NULL, "bodyHash" character varying(64) NOT NULL, "status" character varying(32) NOT NULL, "model" character varying(128), "acceptedCount" integer NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "excludedCount" integer NOT NULL DEFAULT '0', "errorMessage" text, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "finishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bec604b78446dc75c60e8168d11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d28ad7888474ebdd718e56d657" ON "fact_extraction_runs" ("articleId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8dc0bc9ffabdc1ae200bd85eb4" ON "fact_extraction_runs" ("bodyHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26e5d613d794553729d491d89e" ON "fact_extraction_runs" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fact_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "factId" uuid NOT NULL, "analysisRunId" uuid NOT NULL, "verificationStatus" character varying(32) NOT NULL, "sourceQuality" character varying(32) NOT NULL, "sourceIndependence" character varying(64) NOT NULL, "evidenceDirectness" character varying(32) NOT NULL, "comparisonSummary" text NOT NULL, "comparedFactIds" jsonb NOT NULL, "citedPrimarySources" jsonb NOT NULL, "contentAgreement" boolean NOT NULL DEFAULT false, "partialAgreement" boolean NOT NULL DEFAULT false, "contradictionFound" boolean NOT NULL DEFAULT false, "countsAsIndependentEvidence" boolean NOT NULL DEFAULT false, "analyzedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ebeaea9ed9c0121242e4ffea615" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_228f48bc9aa960b4481fdde078" ON "fact_verifications" ("factId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c165f816a6c20ace845dba43b9" ON "fact_verifications" ("analysisRunId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "extracted_facts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "articleId" uuid NOT NULL, "extractionRunId" uuid NOT NULL, "normalizedStatement" text NOT NULL, "originalExpression" text NOT NULL, "entities" jsonb NOT NULL, "eventType" character varying(64) NOT NULL, "occurredAt" character varying(128), "quantityValue" double precision, "quantityUnit" character varying(64), "sourceUrl" character varying(2048) NOT NULL, "evidenceSentence" text NOT NULL, "evidenceMatched" boolean NOT NULL DEFAULT false, "factType" character varying(64) NOT NULL, "isClaim" boolean NOT NULL DEFAULT false, "reviewStatus" character varying(32) NOT NULL DEFAULT 'accepted', "extractedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c1e7a1b9b41cd0d12990959c62e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd617454d1ebfbb6a1f21443fe" ON "extracted_facts" ("articleId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f602aff59c4e119b6a1d7e3ebe" ON "extracted_facts" ("extractionRunId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fact_relations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "analysisRunId" uuid NOT NULL, "relationType" character varying(64) NOT NULL, "factIdA" uuid NOT NULL, "factIdB" uuid NOT NULL, "description" text NOT NULL, "rationale" text NOT NULL, "sourceRefs" jsonb NOT NULL, "isDirectlyConfirmed" boolean NOT NULL DEFAULT false, "isInferred" boolean NOT NULL DEFAULT false, "uncertainty" character varying(16) NOT NULL, "alternativeExplanations" text, "analyzedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c4268581b23a817fb3eae3d3a0f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79e43c668e7f22874c9fa69b61" ON "fact_relations" ("analysisRunId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8a5892320125c1f63a3a8ff55c" ON "fact_relations" ("factIdA") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eee250c3e439c529c3a3067d03" ON "fact_relations" ("factIdB") `,
    );
    await queryRunner.query(
      `CREATE TABLE "analysis_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "runType" character varying(32) NOT NULL, "status" character varying(32) NOT NULL, "inputHash" character varying(64) NOT NULL, "factIds" jsonb NOT NULL, "model" character varying(128), "verificationCount" integer NOT NULL DEFAULT '0', "relationCount" integer NOT NULL DEFAULT '0', "skippedWeakRelationCount" integer NOT NULL DEFAULT '0', "errorMessage" text, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "finishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a433528a661e6b64367e525d357" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5835862043d6054ec54307fec3" ON "analysis_runs" ("runType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8fb41ed86549e22119731fb4f" ON "analysis_runs" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0cf7ac104ea1e8c4837a77d08" ON "analysis_runs" ("inputHash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0cf7ac104ea1e8c4837a77d08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8fb41ed86549e22119731fb4f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5835862043d6054ec54307fec3"`,
    );
    await queryRunner.query(`DROP TABLE "analysis_runs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eee250c3e439c529c3a3067d03"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a5892320125c1f63a3a8ff55c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_79e43c668e7f22874c9fa69b61"`,
    );
    await queryRunner.query(`DROP TABLE "fact_relations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f602aff59c4e119b6a1d7e3ebe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd617454d1ebfbb6a1f21443fe"`,
    );
    await queryRunner.query(`DROP TABLE "extracted_facts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c165f816a6c20ace845dba43b9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_228f48bc9aa960b4481fdde078"`,
    );
    await queryRunner.query(`DROP TABLE "fact_verifications"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26e5d613d794553729d491d89e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8dc0bc9ffabdc1ae200bd85eb4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d28ad7888474ebdd718e56d657"`,
    );
    await queryRunner.query(`DROP TABLE "fact_extraction_runs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3504ae038c845edaa1394dd022"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d9449281432f2337d80d5552bf"`,
    );
    await queryRunner.query(`DROP TABLE "hypothesis_generation_runs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c135fb7fc1e3f0421d22aaccc2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fa1ea1a55f6485dc43a0934b7d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cff777ae86595b42225133166b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d2e7868d12063b6e2585866184"`,
    );
    await queryRunner.query(`DROP TABLE "hypothesis_reevaluations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e123fa56027458eeeb1903c91d"`,
    );
    await queryRunner.query(`DROP TABLE "hypothesis_status_histories"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4b823a689cd18a1ccf8ee35e9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ef223bc54bd12a371030f3289"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f3aad6b25f4b9af3ef49427c75"`,
    );
    await queryRunner.query(`DROP TABLE "hypotheses"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c571cc551bdc7e422d609e7b03"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_363229f02bac07b4ee46d8c773"`,
    );
    await queryRunner.query(`DROP TABLE "crawl_histories"`);
    await queryRunner.query(`DROP TABLE "news_categories"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d2b5cb66b54b6da015a649c952"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a5b7bc077402451f2f6cdf92b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5788ba4d541bd61a227da57b8a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bba2c7f41e62a52461d5eb6179"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_36e79bffd84efef6ef1085de3e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_96bf9f1dd5963904717b28df5d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_027acf06cefb3f659da709e950"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0180944d7207f4630249abd4e"`,
    );
    await queryRunner.query(`DROP TABLE "news_articles"`);
    await queryRunner.query(`DROP TABLE "news_sources"`);
  }
}
