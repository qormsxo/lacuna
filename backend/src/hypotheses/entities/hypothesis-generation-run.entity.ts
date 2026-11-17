import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type HypothesisGenerationRunStatus =
  | 'running'
  | 'completed'
  | 'failed';

@Entity({ name: 'hypothesis_generation_runs' })
export class HypothesisGenerationRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  inputHash!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  status!: HypothesisGenerationRunStatus;

  @Column({ type: 'jsonb' })
  factIds!: string[];

  @Column({ type: 'jsonb' })
  relationIds!: string[];

  @Column({ type: 'varchar', length: 128, nullable: true })
  model!: string | null;

  @Column({ type: 'int', default: 0 })
  hypothesisCount!: number;

  @Column({ type: 'int', default: 0 })
  skippedCount!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
