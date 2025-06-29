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
              return shotTotal + audioCompleted + imagesCompleted + whiteboardCompleted
            }, 0)
          )
        }, 0)
      })

      // 是否全部完成 - 基于白板动画 URLs 数量 = shot 总数
      const isAllCompleted$ = observable(() => {
        const assets = state$.storyAssets.get()
        if (assets.length === 0) return false

        // 计算总的 shots 数量
        const totalShots = assets.reduce((total, scene) => total + scene.shots.length, 0)

        // 计算有白板动画 URL 的数量（即已完成的白板动画）
        const whiteboardUrlsCount = assets.reduce((total, scene) => {
          return total + scene.shots.filter(shot =>
            shot.whiteboard_animation_task?.status === 'completed'
          ).length
        }, 0)

        const isCompleted = whiteboardUrlsCount === totalShots && totalShots > 0

        console.log('[isAllCompleted] Status check:', {
          totalShots,
          whiteboardUrlsCount,
          isCompleted,
        })

        return isCompleted
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
