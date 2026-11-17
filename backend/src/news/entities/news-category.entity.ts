import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'news_categories' })
export class NewsCategoryEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;
}
