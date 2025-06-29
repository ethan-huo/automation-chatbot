import { orpc } from '@/lib/rpc/orpc.client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

type UseWhiteboardAnimationProps = {
  imageAssetId: string
  storyId: string
  sceneId: string
}

export function useWhiteboardAnimation({
  imageAssetId,
  storyId,
  sceneId,
}: UseWhiteboardAnimationProps) {
  const [animationTaskId, setAnimationTaskId] = useState<string | null>(null)

  // 创建白板动画任务
  const createAnimationMutation = useMutation({
    ...orpc.createWhiteboardAnimation.mutationOptions(),
    onSuccess: (data) => {
      setAnimationTaskId(data.taskId)
    },
  })

  // 轮询动画任务状态
  const animationStatusQuery = useQuery({
    ...orpc.getWhiteboardAnimationStatus.queryOptions({
      input: { taskId: animationTaskId! },
    }),
    enabled: !!animationTaskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      const shouldPoll = status === 'pending' || status === 'processing'

      console.log('[useWhiteboardAnimation] Polling decision:', {
        taskId: animationTaskId,
        status,
        shouldPoll,
      })

      return shouldPoll ? 3000 : false
    },
    refetchOnWindowFocus: false, // 避免窗口聚焦时不必要的请求
  })

  const createAnimation = () => {
    createAnimationMutation.mutate({
      imageAssetId,
      storyId,
      sceneId,
    })
  }

  const status = animationStatusQuery.data?.status
  const isLoading =
    createAnimationMutation.isPending ||
    status === 'pending' ||
    status === 'processing'

  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const hasTask = !!animationTaskId

  return {
    // 状态
    animationTaskId,
    status,
    isLoading,
    isCompleted,
    isFailed,
    hasTask,

    // 数据
    animationData: animationStatusQuery.data,

    // 操作
    createAnimation,

    // 查询状态
    isCreating: createAnimationMutation.isPending,
    createError: createAnimationMutation.error,
    statusError: animationStatusQuery.error,
  }
}
