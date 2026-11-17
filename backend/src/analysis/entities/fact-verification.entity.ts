import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EvidenceDirectness } from '../constants/evidence-directness';
import type { SourceIndependence } from '../constants/source-independence';
import type { SourceQuality } from '../constants/source-quality';
import type { VerificationStatus } from '../constants/verification-status';

@Entity({ name: 'fact_verifications' })
export class FactVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  factId!: string;

  @Index()
  @Column({ type: 'uuid' })
  analysisRunId!: string;

  @Column({ type: 'varchar', length: 32 })
  verificationStatus!: VerificationStatus;

  @Column({ type: 'varchar', length: 32 })
  sourceQuality!: SourceQuality;

  @Column({ type: 'varchar', length: 64 })
  sourceIndependence!: SourceIndependence;

  @Column({ type: 'varchar', length: 32 })
  evidenceDirectness!: EvidenceDirectness;

  @Column({ type: 'text' })
  comparisonSummary!: string;

  @Column({ type: 'jsonb' })
  comparedFactIds!: string[];

  @Column({ type: 'jsonb' })
  citedPrimarySources!: string[];

  @Column({ type: 'boolean', default: false })
  contentAgreement!: boolean;

  @Column({ type: 'boolean', default: false })
  partialAgreement!: boolean;

  @Column({ type: 'boolean', default: false })
  contradictionFound!: boolean;

  @Column({ type: 'boolean', default: false })
  countsAsIndependentEvidence!: boolean;

  @Column({ type: 'timestamptz' })
  analyzedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
