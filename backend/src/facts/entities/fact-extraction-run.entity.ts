import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type FactExtractionRunStatus =
  | 'running'
  | 'completed'
  | 'failed';

@Entity({ name: 'fact_extraction_runs' })
export class FactExtractionRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  articleId!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  bodyHash!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  status!: FactExtractionRunStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  model!: string | null;

  @Column({ type: 'int', default: 0 })
  acceptedCount!: number;

  @Column({ type: 'int', default: 0 })
  reviewCount!: number;

  @Column({ type: 'int', default: 0 })
  excludedCount!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
