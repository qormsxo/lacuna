import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'news_articles' })
export class NewsArticleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 2048 })
  normalizedUrl!: string;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  articleKey!: string | null;

  @Column({ type: 'varchar', length: 512 })
  title!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  titleHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  identityHash!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  category!: string;

  @Column({ type: 'varchar', length: 32 })
  source!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  listPublishedAt!: string | null;

  @Index()
  @Column({ type: 'timestamptz' })
  collectedAt!: Date;

  @Index()
  @Column({ type: 'varchar', length: 32, default: 'pending' })
  crawlStatus!:
    | 'pending'
    | 'crawling'
    | 'success'
    | 'failed'
    | 'retry_waiting'
    | 'inaccessible';

  @Column({ type: 'int', default: 0 })
  crawlAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextRetryAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  crawledAt!: Date | null;

  /**
   * Full body is stored only when bodyStorageMode is `full`.
   * Respect site terms/copyright; prefer metadata_only when storage is restricted.
   */
  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'int', nullable: true })
  bodyLength!: number | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  bodyHash!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'full' })
  bodyStorageMode!: 'full' | 'metadata_only';

  @Column({ type: 'boolean', default: false })
  bodyExtracted!: boolean;

  @Column({ type: 'boolean', default: false })
  isDuplicate!: boolean;

  @Column({ type: 'uuid', nullable: true })
  duplicateOfId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  author!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  publishedAt!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  modifiedAt!: string | null;

  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastErrorCode!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

/** @deprecated Use NewsArticleEntity */
export type ArticleEntity = NewsArticleEntity;
