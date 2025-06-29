import type { OpenRouterCompletionSettings } from '@openrouter/ai-sdk-provider'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const enum OpenrouterModel {
  OPENAI_GPT_4O_MINI = 'openai/gpt-4o-mini',
  OPENAI_CODEX_MINI = 'openai/codex-mini',
  OPENAI_O4_MINI_HIGH = 'openai/o4-mini-high',
  OPENAI_O3 = 'openai/o3',
  OPENAI_GPT_4_1 = 'openai/gpt-4.1',
  OPENAI_GPT_4_1_MINI = 'openai/gpt-4.1-mini',
  OPENAI_GPT_4O_MINI_SEARCH_PREVIEW = 'openai/gpt-4o-mini-search-preview',
  OPENAI_GPT_4O_SEARCH_PREVIEW = 'openai/gpt-4o-search-preview',
  OPENAI_GPT_4O = 'openai/gpt-4o',

  GOOGLE_GEMINI_2_5_PRO = 'google/gemini-2.5-flash',
  GOOGLE_GEMINI_2_5_FLASH = 'google/gemini-2.5-flash',

  GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17 = 'google/gemini-2.5-flash-lite-preview-06-17',

  DEEPSEEK_DEEPSEEK_R1_0528 = 'deepseek/deepseek-r1-0528',
  DEEPSEEK_DEEPSEEK_CHAT_V3_0324 = 'deepseek/deepseek-chat-v3-0324',

  ANTHROPIC_CLAUDE_SONNET_4 = 'anthropic/claude-sonnet-4',
  ANTHROPIC_CLAUDE_OPUS_4 = 'anthropic/claude-opus-4',
}

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

export const openrouter = (
  model: OpenrouterModel,
  settings?: OpenRouterCompletionSettings,
) =>
  createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  })(model, settings)
