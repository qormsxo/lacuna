import { Global, Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm-provider';
import { OpenAiCompatibleLlmProvider } from './openai-compatible.provider';

@Global()
@Module({
  providers: [
    OpenAiCompatibleLlmProvider,
    {
      provide: LLM_PROVIDER,
      useExisting: OpenAiCompatibleLlmProvider,
    },
  ],
  exports: [LLM_PROVIDER, OpenAiCompatibleLlmProvider],
})
export class LlmModule {}
