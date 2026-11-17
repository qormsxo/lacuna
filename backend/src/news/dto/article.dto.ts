import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  publisher!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'ISO timestamp or source-provided relative time text',
  })
  publishedAt!: string | null;

  @ApiProperty()
  collectedAt!: string;

  @ApiProperty({ example: '정치' })
  category!: string;

  @ApiProperty({ enum: ['google', 'naver', 'daum'] })
  source!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  summary!: string | null;
}
