import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type CrawlJobType = 'collect' | 'crawl_body';

export type CrawlJobStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

@Entity({ name: 'crawl_histories' })
export class CrawlHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  jobType!: CrawlJobType;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  status!: CrawlJobStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category!: string | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  requestedCount!: number;

  @Column({ type: 'int', default: 0 })
  createdCount!: number;

  @Column({ type: 'int', default: 0 })
  updatedCount!: number;

  @Column({ type: 'int', default: 0 })
  duplicateCount!: number;

  @Column({ type: 'int', default: 0 })
  crawledSuccess!: number;

  @Column({ type: 'int', default: 0 })
  crawledFailed!: number;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
