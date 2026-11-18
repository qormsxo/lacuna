export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    port: parseInt(process.env.API_PORT ?? '3000', 10),
    prefix: process.env.API_PREFIX ?? 'api',
    version: process.env.API_VERSION ?? '1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
  database: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER ?? 'lacuna',
    password: process.env.POSTGRES_PASSWORD ?? 'lacuna',
    name: process.env.POSTGRES_DB ?? 'lacuna',
    synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
    logging: process.env.TYPEORM_LOGGING === 'true',
  },
  news: {
    httpTimeoutMs: parseInt(process.env.NEWS_HTTP_TIMEOUT_MS ?? '15000', 10),
    userAgent:
      process.env.NEWS_USER_AGENT ??
      'Mozilla/5.0 (compatible; LacunaNewsCollector/0.1; +http://localhost)',
    storeFullBody: process.env.NEWS_STORE_FULL_BODY !== 'false',
    crawlConcurrency: parseInt(process.env.NEWS_CRAWL_CONCURRENCY ?? '2', 10),
    crawlIntervalMs: parseInt(process.env.NEWS_CRAWL_INTERVAL_MS ?? '1000', 10),
    crawlMaxAttempts: parseInt(process.env.NEWS_CRAWL_MAX_ATTEMPTS ?? '3', 10),
    crawlRetryDelayMs: parseInt(
      process.env.NEWS_CRAWL_RETRY_DELAY_MS ?? '60000',
      10,
    ),
    scheduleEnabled: process.env.NEWS_SCHEDULE_ENABLED === 'true',
    collectCron: process.env.NEWS_COLLECT_CRON ?? '*/15 * * * *',
    crawlCron: process.env.NEWS_CRAWL_CRON ?? '*/5 * * * *',
    scheduleCrawlBatchLimit: parseInt(
      process.env.NEWS_SCHEDULE_CRAWL_BATCH_LIMIT ?? '20',
      10,
    ),
  },
  llm: {
    provider: process.env.LLM_PROVIDER ?? 'gemini',
    apiKey: process.env.LLM_API_KEY ?? process.env.GEMINI_API_KEY ?? '',
    baseUrl:
      process.env.LLM_BASE_URL ??
      'https://generativelanguage.googleapis.com/v1beta/openai',
    model: process.env.LLM_MODEL ?? 'gemini-3.1-flash-lite',
    temperature: Number(process.env.LLM_TEMPERATURE ?? '0'),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? '60000', 10),
    maxBodyChars: parseInt(process.env.LLM_MAX_BODY_CHARS ?? '12000', 10),
    unmatchedEvidenceMode:
      process.env.LLM_UNMATCHED_EVIDENCE_MODE === 'exclude'
        ? 'exclude'
        : 'review',
  },
  analysis: {
    maxFactsPerRun: parseInt(
      process.env.ANALYSIS_MAX_FACTS_PER_RUN ?? '40',
      10,
    ),
  },
  hypotheses: {
    maxFactsPerRun: parseInt(
      process.env.HYPOTHESIS_MAX_FACTS_PER_RUN ?? '40',
      10,
    ),
    maxReevaluateCandidates: parseInt(
      process.env.HYPOTHESIS_MAX_REEVALUATE_CANDIDATES ?? '20',
      10,
    ),
  },
  logging: {
    dir: process.env.LOG_DIR ?? undefined,
  },
});

