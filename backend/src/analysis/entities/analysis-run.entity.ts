import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AnalysisRunType = 'verification' | 'relation' | 'full';

export type AnalysisRunStatus = 'running' | 'completed' | 'failed';

@Entity({ name: 'analysis_runs' })
export class AnalysisRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  runType!: AnalysisRunType;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  status!: AnalysisRunStatus;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  inputHash!: string;

  @Column({ type: 'jsonb' })
  factIds!: string[];

  @Column({ type: 'varchar', length: 128, nullable: true })
  model!: string | null;

  @Column({ type: 'int', default: 0 })
  verificationCount!: number;

  @Column({ type: 'int', default: 0 })
  relationCount!: number;

  @Column({ type: 'int', default: 0 })
  skippedWeakRelationCount!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
