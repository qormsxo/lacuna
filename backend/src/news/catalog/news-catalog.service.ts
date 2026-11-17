import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NEWS_CATEGORIES } from '../constants/categories';
import { NEWS_SOURCES } from '../constants/sources';
import { NewsCategoryEntity } from '../entities/news-category.entity';
import { NewsSourceEntity } from '../entities/news-source.entity';

const SOURCE_NAMES: Record<(typeof NEWS_SOURCES)[number], string> = {
  google: 'Google News',
  naver: 'Naver News',
  daum: 'Daum News',
};

@Injectable()
export class NewsCatalogService implements OnModuleInit {
  constructor(
    @InjectRepository(NewsSourceEntity)
    private readonly sources: Repository<NewsSourceEntity>,
    @InjectRepository(NewsCategoryEntity)
    private readonly categories: Repository<NewsCategoryEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSources();
    await this.ensureCategories();
  }

  private async ensureSources(): Promise<void> {
    for (const sourceId of NEWS_SOURCES) {
      const existing = await this.sources.findOne({ where: { id: sourceId } });

      if (existing !== null) {
        continue;
      }

      await this.sources.save(
        this.sources.create({
          id: sourceId,
          name: SOURCE_NAMES[sourceId],
          enabled: true,
        }),
      );
    }
  }

  private async ensureCategories(): Promise<void> {
    let sortOrder = 0;

    for (const category of NEWS_CATEGORIES) {
      const existing = await this.categories.findOne({
        where: { id: category },
      });

      if (existing === null) {
        await this.categories.save(
          this.categories.create({
            id: category,
            name: category,
            sortOrder,
            enabled: true,
          }),
        );
      }

      sortOrder += 1;
    }
  }
}
