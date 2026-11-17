import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { HypothesisStatus } from '../constants/hypothesis-status';
import type { ReevaluationEvidenceKind } from '../constants/reevaluation-outcome';

export type HypothesisReevaluationStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

@Entity({ name: 'hypothesis_reevaluations' })
export class HypothesisReevaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  hypothesisId!: string;

  @Index()
  @Column({ type: 'uuid' })
  sourceArticleId!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  evidenceFingerprint!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  status!: HypothesisReevaluationStatus;

  @Column({ type: 'varchar', length: 32 })
  evidenceKind!: ReevaluationEvidenceKind;

  @Column({ type: 'boolean', default: false })
  isIndependentSource!: boolean;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'text', nullable: true })
  evidenceText!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  previousStatus!: HypothesisStatus | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nextStatus!: HypothesisStatus | null;

  @Column({ type: 'text', nullable: true })
  statusReason!: string | null;

  @Column({ type: 'boolean', default: false })
  applied!: boolean;

  @Column({ type: 'timestamptz' })
  evaluatedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
