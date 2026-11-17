import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { HypothesisStatus } from '../constants/hypothesis-status';

@Entity({ name: 'hypothesis_status_histories' })
export class HypothesisStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  hypothesisId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  fromStatus!: HypothesisStatus | null;

  @Column({ type: 'varchar', length: 64 })
  toStatus!: HypothesisStatus;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'jsonb' })
  evidenceRefs!: string[];

  @Column({ type: 'timestamptz' })
  changedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
