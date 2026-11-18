import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDER } from '../../llm/llm-provider';
import type { LlmProvider } from '../../llm/llm-provider';
import { NewsCategory } from '../constants/categories';
import { ArticleDto } from '../dto/article.dto';

type FilterDecision = {
  index: number;
  keep: boolean;
  reason?: string;
};

@Injectable()
export class CategoryTitleFilterService {
  private readonly logger = new Logger(CategoryTitleFilterService.name);

  constructor(
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
  ) {}

  async filterByTitle(
    category: NewsCategory,
    articles: ArticleDto[],
  ): Promise<{ kept: ArticleDto[]; dropped: number }> {
    if (articles.length === 0) {
      return { kept: [], dropped: 0 };
    }

    const titles = articles.map((article, index) => ({
      index,
      title: article.title,
    }));

    try {
      const completion = await this.llmProvider.complete({
        messages: [
          {
            role: 'system',
            content: [
              'You classify Korean news titles for category relevance.',
              'Judge ONLY by the title text. Do not invent article contents.',
              'Return ONLY valid JSON.',
              `Target category: ${category}`,
              'Keep a title only if it clearly belongs to that category.',
              'Drop lifestyle/food/entertainment fluff when the category is 경제, unless the title is clearly about markets, companies, policy, finance, industry, trade, or labor.',
              'JSON schema: {"decisions":[{"index":0,"keep":true,"reason":"짧은 한국어 이유"}]}',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({ category, titles }, null, 2),
          },
        ],
        temperature: 0,
        jsonMode: true,
        context: { stage: 'collect_category_title_filter' },
      });

      const keepByIndex = this.parseDecisions(completion.content, articles.length);

      if (keepByIndex.size === 0) {
        this.logger.warn(
          'Category title filter returned no decisions; keeping all titles',
        );
        return { kept: articles, dropped: 0 };
      }

      const kept: ArticleDto[] = [];
      let dropped = 0;

      for (let index = 0; index < articles.length; index += 1) {
        const article = articles[index];
        if (article === undefined) {
          continue;
        }

        const decision = keepByIndex.get(index);
        if (decision === false) {
          dropped += 1;
          this.logger.log(
            `Title filter dropped category=${category} title=${article.title}`,
          );
          continue;
        }

        // Explicit keep, or missing decision → keep (fail-open on partial replies).
        kept.push(article);
      }

      return { kept, dropped };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Category title filter failed';
      this.logger.warn(
        `Category title filter fallback keep-all: ${message}`,
      );
      // Fail open so collection still works if Gemini is down.
      return { kept: articles, dropped: 0 };
    }
  }

  private parseDecisions(
    raw: string,
    expectedCount: number,
  ): Map<number, boolean> {
    const keepByIndex = new Map<number, boolean>();

    try {
      const parsed = JSON.parse(raw) as {
        decisions?: FilterDecision[];
      };

      if (!Array.isArray(parsed.decisions)) {
        return keepByIndex;
      }

      for (const decision of parsed.decisions) {
        if (
          typeof decision.index !== 'number' ||
          !Number.isInteger(decision.index) ||
          decision.index < 0 ||
          decision.index >= expectedCount ||
          typeof decision.keep !== 'boolean'
        ) {
          continue;
        }

        keepByIndex.set(decision.index, decision.keep);
      }
    } catch {
      return keepByIndex;
    }

    return keepByIndex;
  }
}
