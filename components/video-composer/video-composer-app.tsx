'use client'

import type { StoryAssets } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'

import { RenderProgress } from './render-progress'
import { VideoComposerProvider } from './video-composer-provider'
import { VideoPlayer } from './video-player'

type VideoComposerAppProps = {
  storyAssets?: StoryAssets
  storyId?: string
}

export function VideoComposerApp({
  storyAssets,
  storyId,
}: VideoComposerAppProps) {
  return (
    <VideoComposerProvider>
      <div className="text-foreground mx-auto w-[90vw] max-w-4xl text-center">
        <div className="bg-background overflow-hidden rounded-md border shadow-sm">
          <VideoPlayer storyAssets={storyAssets} storyId={storyId} />
        </div>
        <RenderProgress />
      </div>
    </VideoComposerProvider>
  )
}

// 默认导出，用于动态导入
export default VideoComposerApp
