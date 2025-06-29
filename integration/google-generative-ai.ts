import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { env } from '@/lib/env'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const googleGenerativeAI = createGoogleGenerativeAI({
  apiKey: env.GEMINI_API_KEY,
})

export const enum GoogleGenerativeAIModel {
  GEMINI_2_5_PRO_PREVIEW_06_05 = 'gemini-2.5-pro-preview-06-05',
  GEMINI_2_5_FLASH_PREVIEW_05_20 = 'gemini-2.5-flash-preview-05-20',
}

export const googleProviderOptions = (
  opts: GoogleGenerativeAIProviderOptions,
) => ({
  google: opts,
})
