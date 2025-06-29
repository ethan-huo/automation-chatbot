import { orpc } from '@/lib/rpc/orpc.client'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAnimationAssets } from './provider'

export const useAssetsStatusTracking = (props: { storyId: string }) => {
  const { state$ } = useAnimationAssets()

  // 使用 tanstack query 轮询获取资产状态
  const { data: assetData } = useQuery({
    ...orpc.getAnimationAsset.queryOptions({
      input: {
        storyId: props.storyId,
      },
    }),
    // 智能轮询：只有当还有待处理的任务时才轮询
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data?.assetsByScene) return false

      // 检查是否还有待处理的任务
      const hasPendingTasks = Object.values(data.assetsByScene).some(sceneAssets => {
        const audioPending = sceneAssets.audio?.status === 'pending' || sceneAssets.audio?.status === 'processing'
        const imagesPending = sceneAssets.images.some(img => img.status === 'pending' || img.status === 'processing')
        return audioPending || imagesPending
      })

      console.log('[useAssetsStatusTracking] Polling decision:', {
        storyId: props.storyId,
        hasPendingTasks,
        totalScenes: Object.keys(data.assetsByScene).length
      })

      return hasPendingTasks ? 3000 : false // 3秒轮询间隔
    },
    refetchOnWindowFocus: false, // 避免窗口聚焦时不必要的请求
  })

  // 更新 storyAssets 的状态
  useEffect(() => {
    if (assetData?.assetsByScene) {
      const updatedAssets = state$.storyAssets.peek().map((scene) => {
        const sceneAssets = assetData.assetsByScene[scene.scene_id.toString()]
        if (!sceneAssets) return scene

        return {
          ...scene,
          shots: scene.shots.map((shot) => ({
            ...shot,
            audio_task: {
              ...shot.audio_task,
              status: sceneAssets.audio?.status || shot.audio_task.status,
              audio_url: sceneAssets.audio?.s3Url || shot.audio_task.audio_url,
            },
            image_tasks: shot.image_tasks.map((task, index) => {
              const imageAsset = sceneAssets.images[index]
              return {
                ...task,
                status: imageAsset?.status || task.status,
                image_url: imageAsset?.s3Url || task.image_url,
              }
            }),
          })),
        }
      })
      state$.storyAssets.set(updatedAssets)
    }
  }, [assetData])
}
