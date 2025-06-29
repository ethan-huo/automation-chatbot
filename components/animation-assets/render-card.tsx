'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Memo, use$ } from '@legendapp/state/react'
import { X } from 'lucide-react'
import { useEffect } from 'react'

import { useAnimationAssets } from './provider'

export function RenderCard() {
  const { state$, cancelRendering, updateRenderProgress } = useAnimationAssets()

  useEffect(() => {
    const interval = setInterval(() => {
      const currentProgress = state$.renderProgress.peek()
      if (currentProgress >= 100) {
        clearInterval(interval)
        return
      }
      updateRenderProgress(currentProgress + 10)
    }, 1000)

    return () => clearInterval(interval)
  }, [updateRenderProgress, state$.renderProgress])

  const isCompleted = use$(state$.renderCompleted)
  const progress = use$(state$.renderProgress)
  const videoUrl = use$(state$.renderVideoUrl)

  return (
    <Card className="mx-auto mt-4 max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-semibold">Render</CardTitle>
        {!isCompleted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRendering}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCompleted ? (
          <div className="space-y-2">
            <Memo>
              {() => (
                <div className="flex items-center justify-between text-sm">
                  <span>Rendering animation...</span>
                  <span>{state$.renderProgress.get()}%</span>
                </div>
              )}
            </Memo>
            <Memo>
              {() => (
                <Progress
                  value={state$.renderProgress.get()}
                  className="w-full"
                />
              )}
            </Memo>
          </div>
        ) : (
          <div>
            {videoUrl && (
              <div className="aspect-video w-full overflow-hidden rounded-lg">
                <iframe
                  src={videoUrl}
                  title="Animation Video"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
