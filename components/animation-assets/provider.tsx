'use client'

import type { StoryAssets } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'
import { createContextProvider } from '@/lib/create-context-provider'
import { orpc } from '@/lib/rpc/orpc.client'
import { observable, observe } from '@legendapp/state'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

type AnimationState = {
  storyAssets: StoryAssets
  isRendering: boolean
  renderProgress: number
  renderCompleted: boolean
  renderVideoUrl: string | null
  storyId: string
}

export const [AnimationAssetsProvider, useAnimationAssets] =
  createContextProvider(
    (props: { storyAssets: StoryAssets; storyId: string }) => {
      const state$ = observable<AnimationState>({
        storyAssets: props.storyAssets,
        isRendering: false,
        renderProgress: 0,
        renderCompleted: false,
        renderVideoUrl: null,
        storyId: props.storyId,
      })

      const whiteboardAnimationTasks$ = observable<
        {
          taskId: string
          status: 'pending' | 'completed' | 'failed'
          videoUrl: string | null
        }[]
      >([])

      // 计算总任务数
      const totalTasks$ = observable(() => {
        const assets = state$.storyAssets.get()
        return assets.reduce((total, scene) => {
          return (
            total +
            scene.shots.reduce((shotTotal, shot) => {
              // 基础任务：音频 + 图片 + 白板动画（固定3个任务）
              return shotTotal + 1 + shot.image_tasks.length + 1
            }, 0)
          )
        }, 0)
      })

      // 计算完成任务数
      const completedTasks$ = observable(() => {
        const assets = state$.storyAssets.get()
        return assets.reduce((total, scene) => {
          return (
            total +
            scene.shots.reduce((shotTotal, shot) => {
              const audioCompleted =
                shot.audio_task.status === 'completed' ? 1 : 0
              const imagesCompleted = shot.image_tasks.filter(
                (t) => t.status === 'completed',
              ).length
              const whiteboardCompleted =
                shot.whiteboard_animation_task?.status === 'completed' ? 1 : 0
              return (
                shotTotal +
                audioCompleted +
                imagesCompleted +
                whiteboardCompleted
              )
            }, 0)
          )
        }, 0)
      })

      // 是否全部完成 - 基于白板动画 URLs 数量 = shot 总数
      const isAllCompleted$ = observable(() => {
        const whiteboardAnimationTasks = whiteboardAnimationTasks$.get()
        const completedWhiteboardAnimationTasks =
          whiteboardAnimationTasks.filter((task) => task.status === 'completed')
        const shotCount = state$.storyAssets.get().reduce((total, scene) => {
          return total + scene.shots.length
        }, 0)

        console.log(
          '[AnimationAssetsProvider] 📝 completedWhiteboardAnimationTasks',
          {
            completedWhiteboardAnimationTasks,
            shotCount,
            storyAssets: state$.storyAssets.peek(),
            isAllCompleted:
              completedWhiteboardAnimationTasks.length === shotCount,
          },
        )

        return completedWhiteboardAnimationTasks.length === shotCount
      })

      // Actions
      const startRendering = () => {
        if (isAllCompleted$.peek()) {
          state$.assign({
            isRendering: true,
            renderProgress: 0,
            renderCompleted: false,
            renderVideoUrl: null,
          })
        }
      }

      const cancelRendering = () => {
        state$.isRendering.set(false)
      }

      const updateRenderProgress = (progress: number) => {
        state$.renderProgress.set(progress)
        if (progress >= 100) {
          state$.assign({
            renderCompleted: true,
            renderVideoUrl: 'https://www.youtube.com/embed/j-qgNJcg19s',
          })
        }
      }

      return {
        state$,
        totalTasks$,
        completedTasks$,
        isAllCompleted$,
        whiteboardAnimationTasks$,
        startRendering,
        cancelRendering,
        updateRenderProgress,
      }
    },
  )
