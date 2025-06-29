'use client'

import type { StoryAssets } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'
import { createContextProvider } from '@/lib/create-context-provider'
import { orpc } from '@/lib/rpc/orpc.client'
import { observable } from '@legendapp/state'
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

      // 计算总任务数
      const totalTasks$ = observable(() => {
        const assets = state$.storyAssets.get()
        return assets.reduce((total, scene) => {
          return (
            total +
            scene.shots.reduce((shotTotal, shot) => {
              return shotTotal + 1 + shot.image_tasks.length
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
              return shotTotal + audioCompleted + imagesCompleted
            }, 0)
          )
        }, 0)
      })

      // 是否全部完成
      const isAllCompleted$ = observable(() => {
        return (
          completedTasks$.get() === totalTasks$.get() && totalTasks$.get() > 0
        )
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
        startRendering,
        cancelRendering,
        updateRenderProgress,
      }
    },
  )
