import { type } from 'arktype'

/**
 * @deprecated use falModels instead
 */
export enum FalModel {
  FLEX_PRO_KONTEXT = 'fal-ai/flux-pro/kontext',
  FLEX_PRO_KONTEXT_MAX = 'fal-ai/flux-pro/kontext/max',

  FLEX_PRO_KONTEXT_MAX_TEXT_TO_IMAGE = 'fal-ai/flux-pro/kontext/max/text-to-image',
  FLEX_PRO_KONTEXT_TEXT_TO_IMAGE = 'fal-ai/flux-pro/kontext/text-to-image',

  FLEX_PRO_KONTEXT_MAX_MULTI = 'fal-ai/flux-pro/kontext/max/multi',
  FLEX_PRO_KONTEXT_MULTI = 'fal-ai/flux-pro/kontext/multi',

  KLING_VIDEO_V2_1_MASTER_IMAGE_TO_VIDEO = 'fal-ai/kling-video/v2.1/master/image-to-video',
  KLING_VIDEO_V2_1_MASTER_TEXT_TO_VIDEO = 'fal-ai/kling-video/v2.1/master/text-to-video',

  IMAGEN4_PREVIEW = 'fal-ai/imagen4/preview',

  VEO3 = 'fal-ai/veo3',

  IDEOGRAM_V3_REFRAME = 'fal-ai/ideogram/v3/reframe',

  // audio
  MMAUDIO_V2 = 'fal-ai/mmaudio-v2',
  PLAYAI_TTS_DIALOG = 'fal-ai/playai/tts/dialog',
}

export const klingV21InputSchema = type({
  prompt: 'string',
  image_url: 'string',
  duration: "'5' | '10' = '5'",
  aspect_ratio: "'16:9' | '9:16' | '1:1' = '16:9'",
  'negative_prompt?': 'string',
  cfg_scale: 'number = 0.5',
})

export type KlingV21Input = typeof klingV21InputSchema.inferIn

export const klingV21OutputSchema = type({
  video: { url: 'string.url' },
})

export type KlingV21Output = typeof klingV21OutputSchema.inferOut

const aspectRatioSchema = type(
  `"21:9" | "16:9" | "4:3" | "3:2" | "1:1" | "2:3" | "3:4" | "9:16" | "9:21"`,
)

const kontextInputSchema = type({
  prompt: 'string',
  'seed?': 'number',
  guidance_scale: 'number = 3.5',
  'sync_mode?': 'boolean',
  num_images: 'number = 1',
  safety_tolerance: "string = '2'",
  output_format: "'jpeg' | 'png' = 'jpeg'",
  'aspect_ratio?': aspectRatioSchema,
  image_url: 'string',
})

const kontextOutputSchema = type({
  images: [
    {
      url: 'string',
      'content_type?': 'string',
      'file_name?': 'string',
      'file_size?': 'number',
      'file_data?': 'string',
      'width?': 'number',
      'height?': 'number',
    },
  ],
  timings: 'object',
  seed: 'number',
  has_nsfw_concepts: 'boolean[]',
})

const kontextMultiInputSchema = type({
  prompt: 'string',
  'seed?': 'number',
  guidance_scale: 'number = 3.5',
  'sync_mode?': 'boolean',
  num_images: 'number = 1',
  safety_tolerance: "string = '2'",
  output_format: "'jpeg' | 'png' = 'jpeg'",
  'aspect_ratio?': aspectRatioSchema,
  image_urls: 'string[]',
})

const kontextTextToImageInputSchema = type({
  prompt: 'string',
  'seed?': 'number',
  guidance_scale: 'number = 3.5',
  'sync_mode?': 'boolean',
  num_images: 'number = 1',
  safety_tolerance: "string = '2'",
  output_format: "'jpeg' | 'png' = 'jpeg'",
  aspect_ratio: aspectRatioSchema.or('"1:1"').default('1:1'),
})

const kontextTextToImageOutputSchema = type({
  images: [
    {
      url: 'string',
      width: 'number',
      height: 'number',
      'content_type?': 'string',
    },
  ],
  timings: 'object',
  seed: 'number',
  has_nsfw_concepts: 'boolean[]',
  prompt: 'string',
})

const veo3InputSchema = type({
  prompt: 'string',
  aspect_ratio: "'16:9' | '9:16' | '1:1' = '16:9'",
  duration: "'8s' = '8s'",
  'negative_prompt?': 'string',
  enhance_prompt: 'boolean = true',
  'seed?': 'number',
  generate_audio: 'boolean = true',
})

const veo3OutputSchema = type({
  video: {
    url: 'string',
    'content_type?': 'string',
    'file_name?': 'string',
    'file_size?': 'number',
    'file_data?': 'string',
  },
})

const mmaudioV2InputSchema = type({
  video_url: 'string',
  prompt: 'string',
  negative_prompt: 'string = ""',
  'seed?': 'number',
  num_steps: 'number = 25',
  duration: 'number = 8',
  cfg_strength: 'number = 4.5',
  'mask_away_clip?': 'boolean',
})

const mmaudioV2OutputSchema = type({
  video: {
    url: 'string',
    'content_type?': 'string',
    'file_name?': 'string',
    'file_size?': 'number',
    'file_data?': 'string',
  },
})

const ideogramV3ReframeInputSchema = type({
  'image_urls?': 'string[]',
  rendering_speed: "'TURBO' | 'BALANCED' | 'QUALITY' = 'BALANCED'",
  'color_palette?': 'object',
  'style_codes?': 'string[]',
  'style?': "'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN'",
  num_images: 'number = 1',
  'seed?': 'number',
  image_url: 'string',
  image_size:
    "'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9' | object",
})

const ideogramV3ReframeOutputSchema = type({
  images: [
    {
      url: 'string',
      'content_type?': 'string',
      'file_name?': 'string',
      'file_size?': 'number',
    },
  ],
  seed: 'number',
})

export const falModels = {
  'flux-pro/kontext': {
    id: 'fal-ai/flux-pro/kontext',
    input: kontextInputSchema,
    output: kontextOutputSchema,
  },
  'flux-pro/kontext/max': {
    id: 'fal-ai/flux-pro/kontext/max',
    input: kontextInputSchema,
    output: kontextOutputSchema,
  },
  'flux-pro/kontext/max/text-to-image': {
    id: 'fal-ai/flux-pro/kontext/max/text-to-image',
    input: kontextTextToImageInputSchema,
    output: kontextTextToImageOutputSchema,
  },
  'flux-pro/kontext/text-to-image': {
    id: 'fal-ai/flux-pro/kontext/text-to-image',
    input: kontextTextToImageInputSchema,
    output: kontextTextToImageOutputSchema,
  },
  'flux-pro/kontext/max/multi': {
    id: 'fal-ai/flux-pro/kontext/max/multi',
    input: kontextMultiInputSchema,
    output: kontextOutputSchema,
  },
  'flux-pro/kontext/multi': {
    id: 'fal-ai/flux-pro/kontext/multi',
    input: kontextMultiInputSchema,
    output: kontextOutputSchema,
  },
  'kling-video/v2.1/master/image-to-video': {
    id: 'fal-ai/kling-video/v2.1/master/image-to-video',
    input: klingV21InputSchema,
    output: klingV21OutputSchema,
  },
  'kling-video/v2.1/master/text-to-video': {
    id: 'fal-ai/kling-video/v2.1/master/text-to-video',
    input: klingV21InputSchema,
    output: klingV21OutputSchema,
  },
  'imagen4/preview': {
    id: 'fal-ai/imagen4/preview',
    input: type({}),
    output: type({}),
  },
  veo3: {
    id: 'fal-ai/veo3',
    input: veo3InputSchema,
    output: veo3OutputSchema,
  },
  'ideogram/v3/reframe': {
    id: 'fal-ai/ideogram/v3/reframe',
    input: ideogramV3ReframeInputSchema,
    output: ideogramV3ReframeOutputSchema,
  },
  'mmaudio-v2': {
    id: 'fal-ai/mmaudio-v2',
    input: mmaudioV2InputSchema,
    output: mmaudioV2OutputSchema,
  },
  'playai/tts/dialog': {
    id: 'fal-ai/playai/tts/dialog',
    input: type({}),
    output: type({}),
  },
}
