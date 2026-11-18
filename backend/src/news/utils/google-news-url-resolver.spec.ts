import { ConfigService } from '@nestjs/config';
import { GoogleNewsUrlResolver } from './google-news-url-resolver';

describe('GoogleNewsUrlResolver', () => {
  it('returns non-google urls unchanged', async () => {
    const resolver = new GoogleNewsUrlResolver(
      new ConfigService({
        news: {
          httpTimeoutMs: 5000,
          userAgent: 'test',
        },
      }),
    );

    const url = 'https://www.chosun.com/opinion/editorial/1/';
    await expect(resolver.resolve(url)).resolves.toBe(url);
  });
});
