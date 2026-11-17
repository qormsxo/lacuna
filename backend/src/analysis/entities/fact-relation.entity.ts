import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { RelationType } from '../constants/relation-types';
import type { UncertaintyLevel } from '../constants/uncertainty';

@Entity({ name: 'fact_relations' })
export class FactRelationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  analysisRunId!: string;

  @Column({ type: 'varchar', length: 64 })
  relationType!: RelationType;

  @Index()
  @Column({ type: 'uuid' })
  factIdA!: string;

  @Index()
  @Column({ type: 'uuid' })
  factIdB!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  rationale!: string;

  @Column({ type: 'jsonb' })
  sourceRefs!: string[];

  @Column({ type: 'boolean', default: false })
  isDirectlyConfirmed!: boolean;

  @Column({ type: 'boolean', default: false })
  isInferred!: boolean;

  @Column({ type: 'varchar', length: 16 })
  uncertainty!: UncertaintyLevel;

  @Column({ type: 'text', nullable: true })
  alternativeExplanations!: string | null;

  @Column({ type: 'timestamptz' })
  analyzedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
