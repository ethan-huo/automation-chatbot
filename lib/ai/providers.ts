import { falModels } from '@/integration/fal/fal.models'
import { fal } from '@ai-sdk/fal'
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai'

import { isTestEnvironment } from '../constants'
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test'
import { openrouter, OpenrouterModel } from './openrouter'

// Create xAI client with API key
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
      imageModels: {
        'small-model': fal.image(
          falModels['flux-pro/kontext/text-to-image'].id,
        ),
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openrouter(OpenrouterModel.OPENAI_GPT_4_1_MINI),
        'chat-model-reasoning': wrapLanguageModel({
          model: openrouter(OpenrouterModel.OPENAI_GPT_4_1_MINI),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openrouter(OpenrouterModel.OPENAI_GPT_4_1_MINI),
        'artifact-model': openrouter(OpenrouterModel.OPENAI_GPT_4_1_MINI),
      },
      imageModels: {
        'small-model': fal.image(
          falModels['flux-pro/kontext/text-to-image'].id,
        ),
      },
    })
