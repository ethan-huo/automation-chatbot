'use client'

import type { StoryAssets } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Memo, Show, use$ } from '@legendapp/state/react'
import { Play } from 'lucide-react'
import dynamic from 'next/dynamic'

import { CircularProgress } from './circular-progress'
import { AnimationAssetsProvider, useAnimationAssets } from './provider'
import { RenderCard } from './render-card'
import { Scene } from './scene'
import { useAssetsStatusTracking } from './use-assets-status-tracking'

// Dynamic import to avoid SSR issues with video composer
const VideoComposerApp = dynamic(
  () =>
    import('@/components/video-composer/video-composer-app').then((mod) => ({
      default: mod.VideoComposerApp,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-64 items-center justify-center rounded-lg border">
        <div className="text-center">
          <div className="text-muted-foreground mb-2 text-sm">
            Loading video composer...
          </div>
          <div className="bg-muted h-2 w-32 animate-pulse rounded"></div>
        </div>
      </div>
    ),
  },
)

function AnimationAssetsContent() {
  const {
    state$,
    totalTasks$,
    completedTasks$,
    isAllCompleted$,
    startRendering,
  } = useAnimationAssets()

  const storyAssets = use$(state$.storyAssets)
  const isAllCompleted = use$(isAllCompleted$)

  useAssetsStatusTracking({ storyId: state$.storyId.peek() })

  return (
    <div className="space-y-4">
      {/* Animation Assets Section */}
      <div className="mx-auto max-w-2xl rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-md font-semibold">Animation Scenes</h3>
          <Button
            onClick={startRendering}
            variant="ghost"
            className="h-12 w-12 p-0"
            disabled={!isAllCompleted}
          >
            <Memo>
              {() =>
                isAllCompleted$.get() ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <CircularProgress
                    size={40}
                    fillColor="#3b82f6"
                    total={totalTasks$.get()}
                    current={completedTasks$.get()}
                  />
                )
              }
            </Memo>
          </Button>
        </div>
        <ScrollArea className="h-[600px] w-full">
          <div className="space-y-4 pr-4">
            {storyAssets.map((scene, index) => (
              <Scene key={`scene-${scene.scene_id}-${index}`} scene={scene} />
            ))}
          </div>
        </ScrollArea>
      </div>

      <Show if={state$.isRendering}>
        <RenderCard />
      </Show>

      {/* Video Composer Section - 当所有资产准备好后显示 */}
      <Show if={isAllCompleted}>
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold">Video Composition</h3>
              <div className="text-muted-foreground text-sm">
                All assets ready for composition
              </div>
            </div>
          </div>

          <VideoComposerApp
            storyAssets={storyAssets}
            storyId={state$.storyId.peek()}
          />
        </div>
      </Show>
    </div>
  )
}

type AnimationAssetsProps = {
  storyAssets: StoryAssets
  storyId: string
}

export function AnimationAssets({
  storyAssets,
  storyId,
}: AnimationAssetsProps) {
  return (
    <AnimationAssetsProvider storyAssets={storyAssets} storyId={storyId}>
      <AnimationAssetsContent />
    </AnimationAssetsProvider>
  )
}
