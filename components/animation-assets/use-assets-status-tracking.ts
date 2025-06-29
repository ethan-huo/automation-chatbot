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
    // 停止轮询 - 临时修复
    refetchInterval: false,
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
