import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EventType } from '../constants/event-types';
import type { FactType } from '../constants/fact-types';


export type FactReviewStatus = 'accepted' | 'needs_review';

@Entity({ name: 'extracted_facts' })
export class ExtractedFactEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  articleId!: string;

  @Index()
  @Column({ type: 'uuid' })
  extractionRunId!: string;

  @Column({ type: 'text' })
  normalizedStatement!: string;

  @Column({ type: 'text' })
  originalExpression!: string;

  @Column({ type: 'jsonb' })
  entities!: string[];

  @Column({ type: 'varchar', length: 64 })
  eventType!: EventType;

  @Column({ type: 'varchar', length: 128, nullable: true })
  occurredAt!: string | null;

  @Column({ type: 'float', nullable: true })
  quantityValue!: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  quantityUnit!: string | null;

  @Column({ type: 'varchar', length: 2048 })
  sourceUrl!: string;

  @Column({ type: 'text' })
  evidenceSentence!: string;

  @Column({ type: 'boolean', default: false })
  evidenceMatched!: boolean;

  @Column({ type: 'varchar', length: 64 })
  factType!: FactType;

  @Column({ type: 'boolean', default: false })
  isClaim!: boolean;

  @Column({ type: 'varchar', length: 32, default: 'accepted' })
  reviewStatus!: FactReviewStatus;

  @Column({ type: 'timestamptz' })
  extractedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
