import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { HypothesisStatus } from '../constants/hypothesis-status';

@Entity({ name: 'hypotheses' })
export class HypothesisEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  generationRunId!: string;

  @Column({ type: 'varchar', length: 512 })
  title!: string;

  @Column({ type: 'text' })
  coreClaim!: string;

  @Column({ type: 'text' })
  derivationProcess!: string;

  @Column({ type: 'jsonb' })
  relatedFactIds!: string[];

  @Column({ type: 'jsonb' })
  relatedRelationIds!: string[];

  @Column({ type: 'jsonb' })
  supportingEvidence!: string[];

  @Column({ type: 'jsonb' })
  contradictingEvidence!: string[];

  @Column({ type: 'jsonb' })
  alternativeExplanations!: string[];

  @Column({ type: 'jsonb' })
  assumptions!: string[];

  @Column({ type: 'text' })
  uncertaintyAndLimits!: string;

  @Column({ type: 'jsonb' })
  additionalVerificationItems!: string[];

  @Column({ type: 'jsonb' })
  relatedArticleUrls!: string[];

  @Column({ type: 'text' })
  factsVersusInference!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  status!: HypothesisStatus;

  @Column({ type: 'timestamptz' })
  generatedAt!: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  lastReevaluatedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
