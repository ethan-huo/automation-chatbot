import { z } from 'zod'

// Step 1: 经过主 Agent 与用户澄清后，所有字段都变为必填项
export const projectSchema = z.object({
  topic: z
    .string()
    .describe(
      'The core theme or concept of the video. For example: "Introduction to Quantum Computing" or "How to Manage Time Effectively".',
    ),
  targetAudience: z
    .string()
    .describe(
      'The target audience for the video. This affects content depth and language style. For example: "middle school students", "marketing managers", "software developers".',
    ),
  tone: z
    .enum(['professional', 'friendly', 'energetic', 'inspirational'])
    .describe(
      "The overall emotional tone of the video. For example: 'professional' (professional and rigorous), 'friendly' (relaxed and friendly), 'energetic' (full of energy), 'inspirational' (inspiring).",
    ),
  desiredDurationInSeconds: z
    .number()
    .describe(
      'The approximate duration of the video desired by the user, in seconds. For example: 60 or 90.',
    ),
  callToAction: z
    .string()
    .describe(
      'The specific action you want viewers to take after watching the video. For example: "visit our website a.com", "download our APP", "subscribe to the channel".',
    ),

  // Visual Settings
  aspectRatio: z
    .enum(['16:9', '9:16', '1:1', '4:3'])
    .describe(
      'Aspect ratio setting. 16:9 is suitable for landscape viewing, 9:16 for mobile portrait, 1:1 for social media square videos.',
    ),

  visualStyle: z
    .enum(['minimalist', 'detailed', 'sketch', 'doodle'])
    .describe(
      'Visual style preference. minimalist: clean lines, detailed: rich details, sketch: sketch style, doodle: doodle style.',
    ),

  lineStyle: z
    .enum(['thin', 'medium', 'thick', 'varied'])
    .describe(
      'Line thickness style. thin: thin lines, medium: medium lines, thick: thick lines, varied: varied lines.',
    ),

  colorScheme: z
    .enum(['monochrome', 'two-color', 'limited-color'])
    .describe(
      'Color scheme. monochrome: single color black and white, two-color: two-color scheme, limited-color: limited color palette.',
    ),

  backgroundStyle: z
    .enum(['clean-white', 'grid-paper', 'notebook', 'digital-whiteboard'])
    .describe(
      'Background style. clean-white: pure white background, grid-paper: grid paper, notebook: notebook style, digital-whiteboard: digital whiteboard.',
    ),
})

export type Project = z.infer<typeof projectSchema>
