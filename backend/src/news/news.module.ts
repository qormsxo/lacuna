import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ARTICLE_COLLECTION_STORE } from './articles/article-collection.store';
import { ARTICLE_CRAWL_STORE } from './articles/article-crawl.store';
import { ArticleService } from './articles/article.service';
import { NewsCatalogService } from './catalog/news-catalog.service';
import { DaumNewsCollector } from './collectors/daum-news.collector';
import { GoogleNewsCollector } from './collectors/google-news.collector';
import { NEWS_COLLECTORS } from './collectors/news-collector';
import { NaverNewsCollector } from './collectors/naver-news.collector';
import { CrawlService } from './crawl/crawl.service';
import { BODY_EXTRACTOR_RUNNER } from './crawl/extractors/body-extractor.runner';
import { BodyExtractorService } from './crawl/extractors/body-extractor.service';
import { CommonBodyExtractor } from './crawl/extractors/common-body.extractor';
import { DaumBodyExtractor } from './crawl/extractors/daum-body.extractor';
import { NaverBodyExtractor } from './crawl/extractors/naver-body.extractor';
import { CrawlHistoryEntity } from './entities/crawl-history.entity';
import { NewsArticleEntity } from './entities/news-article.entity';
import { NewsCategoryEntity } from './entities/news-category.entity';
import { NewsSourceEntity } from './entities/news-source.entity';
import { HtmlFetcher } from './http/html-fetcher';
import { RssFeedLoader } from './http/rss-feed-loader';
import { CrawlHistoryService } from './jobs/crawl-history.service';
import { CollectionJobService } from './jobs/collection-job.service';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { CollectionSchedulerService } from './schedule/collection-scheduler.service';
import { CategoryTitleFilterService } from './filters/category-title-filter.service';
import { GoogleNewsUrlResolver } from './utils/google-news-url-resolver';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      NewsArticleEntity,
      NewsSourceEntity,
      NewsCategoryEntity,
      CrawlHistoryEntity,
    ]),
  ],
  controllers: [NewsController],
  providers: [
    HtmlFetcher,
    RssFeedLoader,
    GoogleNewsUrlResolver,
    CategoryTitleFilterService,
    GoogleNewsCollector,
    NaverNewsCollector,
    DaumNewsCollector,
    {
      provide: NEWS_COLLECTORS,
      inject: [GoogleNewsCollector, NaverNewsCollector, DaumNewsCollector],
      useFactory: (
        google: GoogleNewsCollector,
        naver: NaverNewsCollector,
        daum: DaumNewsCollector,
      ) => [google, naver, daum],
    },
    ArticleService,
    {
      provide: ARTICLE_COLLECTION_STORE,
      useExisting: ArticleService,
    },
    {
      provide: ARTICLE_CRAWL_STORE,
      useExisting: ArticleService,
    },
    NewsCatalogService,
    CrawlHistoryService,
    CollectionJobService,
    CollectionSchedulerService,
    NaverBodyExtractor,
    DaumBodyExtractor,
    CommonBodyExtractor,
    BodyExtractorService,
    {
      provide: BODY_EXTRACTOR_RUNNER,
      useExisting: BodyExtractorService,
    },
    CrawlService,
    NewsService,
  ],
  exports: [NewsService, ArticleService, CrawlService, CrawlHistoryService],
})
export class NewsModule {}
