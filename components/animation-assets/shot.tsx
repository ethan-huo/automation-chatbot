'use client'

import type { Shot as ShotType } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'

import { AudioTask } from './audio-task'
import { ImageTask } from './image-task'
import { useAnimationAssets } from './provider'
import { WhiteboardAnimation } from './whiteboard-animation'

type ShotProps = {
  shot: ShotType
  sceneId: string // 添加场景 ID 参数
}

export function Shot({ shot, sceneId }: ShotProps) {
  const { state$ } = useAnimationAssets()
  const storyId = state$.storyId.peek()

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground text-sm leading-relaxed">
        {shot.narration_text}
      </div>

      {/* 上方：Image 和 Video 并排 */}
      <div className="grid gap-4 md:grid-cols-2">
        {shot.image_tasks.map((imageTask, index) => {
          const isImageCompleted =
            imageTask.status === 'completed' && imageTask.image_url

          // 检查音频是否也已完成 - 白板动画需要音频时长信息
          const isAudioCompleted = shot.audio_task.status === 'completed'

          // 只有当图片和音频都完成时才启动白板动画
          const canStartAnimation = isImageCompleted && isAudioCompleted

          return (
            <div key={imageTask.task_id} className="contents">
              {/* Image 区域 */}
              <div className="aspect-video overflow-hidden rounded-lg border bg-gray-50">
                <ImageTask task={imageTask} index={index} />
              </div>

              {/* Video 区域 */}
              <div className="aspect-video overflow-hidden rounded-lg border bg-gray-50">
                {canStartAnimation ? (
                  <WhiteboardAnimation
                    imageAssetId={imageTask.task_id}
                    storyId={storyId}
                    sceneId={sceneId} // 使用正确的场景 ID
                    imageUrl={imageTask.image_url!}
                    className="h-full"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground text-sm">
                      {!isImageCompleted && !isAudioCompleted
                        ? 'Waiting for image & audio...'
                        : !isImageCompleted
                          ? 'Waiting for image...'
                          : 'Waiting for audio...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 下方：Audio 横跨整行 */}
      <div className="flex h-8 flex-col rounded-full border *:h-full">
        <AudioTask task={shot.audio_task} />
      </div>
    </div>
  )
}
