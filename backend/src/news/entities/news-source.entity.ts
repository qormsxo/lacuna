import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'news_sources' })
export class NewsSourceEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;
}
