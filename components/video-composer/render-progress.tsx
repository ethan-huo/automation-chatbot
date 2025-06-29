import { Progress } from '@/components/ui/progress'
import { Show, use$ } from '@legendapp/state/react'

import { useVideoComposer } from './video-composer-provider'

export function RenderProgress() {
  const { state$ } = useVideoComposer()

  const renderProgress = use$(state$.renderProgress)
  const progressValue =
    renderProgress.total > 0
      ? (renderProgress.progress / renderProgress.total) * 100
      : 0

  return (
    <Show if={() => renderProgress.isRendering}>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center backdrop-blur-[40px] backdrop-brightness-60">
        <div className="flex w-full max-w-md flex-col items-center gap-8 px-8">
          <h1 className="text-foreground m-0 text-6xl font-semibold">
            {Math.round(progressValue)}%
          </h1>
          <div className="w-full space-y-2">
            <Progress value={progressValue} className="h-2 w-full" />
            <p className="text-muted-foreground text-center text-sm">
              Rendering video... {renderProgress.progress} /{' '}
              {renderProgress.total} frames
            </p>
          </div>
        </div>
      </div>
    </Show>
  )
}
