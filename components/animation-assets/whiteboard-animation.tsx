'use client'

import { Spinner } from '@/components/ui/kibo-ui/spinner'
import { orpc } from '@/lib/rpc/orpc.client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Loader2, VideoIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAnimationAssets } from './provider'

type WhiteboardAnimationProps = {
  imageAssetId: string
  storyId: string
  sceneId: string
  imageUrl: string
  className?: string
}

export function WhiteboardAnimation({
  imageAssetId,
  storyId,
  sceneId,
  imageUrl,
  className,
}: WhiteboardAnimationProps) {
  const [animationTaskId, setAnimationTaskId] = useState<string | null>(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [hasAutoStarted, setHasAutoStarted] = useState(false)

  const { whiteboardAnimationTasks$ } = useAnimationAssets()

  // 创建白板动画任务的 mutation
  const createAnimationMutation = useMutation({
    ...orpc.createWhiteboardAnimation.mutationOptions(),
    onSuccess: (data) => {
      console.log(
        '[WhiteboardAnimation] ✅ Animation task created successfully:',
        {
          taskId: data.taskId,
          imageAssetId,
          storyId,
          sceneId,
        },
      )
      setAnimationTaskId(data.taskId)
    },
    onError: (error) => {
      console.error(
        '[WhiteboardAnimation] ❌ Failed to create animation task:',
        {
          error: error.message,
          imageAssetId,
          storyId,
          sceneId,
        },
      )
    },
  })

  // 轮询动画任务状态
  const { data: animationStatus } = useQuery({
    ...orpc.getWhiteboardAnimationStatus.queryOptions({
      input: { taskId: animationTaskId! },
    }),
    enabled: !!animationTaskId,
    // 智能轮询：只有当任务还在处理中时才轮询
    refetchInterval: (query) => {
      const status = query.state.data?.status
      const shouldPoll = status === 'pending' || status === 'processing'

      console.log('[WhiteboardAnimation] Polling decision:', {
        taskId: animationTaskId,
        status,
        shouldPoll,
      })

      return shouldPoll ? 3000 : false // 3秒轮询间隔
    },
    refetchOnWindowFocus: false, // 避免窗口聚焦时不必要的请求
  })

  const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleVideoLoad = () => {
    setIsVideoLoaded(true)
  }

  // 重置加载状态
  useEffect(() => {
    if (animationStatus?.status !== 'completed') {
      setIsVideoLoaded(false)
    }
  }, [animationStatus?.status])

  // 自动启动动画生成
  useEffect(() => {
    if (
      imageUrl &&
      !animationTaskId &&
      !hasAutoStarted &&
      !createAnimationMutation.isPending
    ) {
      console.log(
        '[WhiteboardAnimation] 🚀 Auto-starting animation generation for:',
        {
          imageAssetId,
          storyId,
          sceneId,
          imageUrl,
        },
      )

      setHasAutoStarted(true)
      createAnimationMutation.mutate({
        imageAssetId,
        storyId,
        sceneId,
      })
    }
  }, [
    imageUrl,
    animationTaskId,
    hasAutoStarted,
    createAnimationMutation.isPending,
    imageAssetId,
    storyId,
    sceneId,
  ])

  const isCompleted = animationStatus?.status === 'completed'
  const isFailed = animationStatus?.status === 'failed'

  // 注册完成的白板动画任务到全局状态
  useEffect(() => {
    if (
      animationTaskId &&
      animationStatus?.status === 'completed' &&
      animationStatus?.s3Url
    ) {
      console.log(
        '[WhiteboardAnimation] 📝 Registering completed animation task:',
        {
          taskId: animationTaskId,
          videoUrl: animationStatus.s3Url,
          imageAssetId,
          sceneId,
        },
      )

      // 检查是否已经注册过这个任务
      const existingTask = whiteboardAnimationTasks$
        .peek()
        .find((task) => task.taskId === animationTaskId)

      if (!existingTask) {
        // 向全局状态注册完成的动画任务
        whiteboardAnimationTasks$.push({
          taskId: animationTaskId,
          status: 'completed',
          videoUrl: animationStatus.s3Url,
        })
      }
    }
  }, [
    animationTaskId,
    animationStatus?.status,
    animationStatus?.s3Url,
    whiteboardAnimationTasks$,
    imageAssetId,
    sceneId,
  ])

  return (
    <div className={`h-full ${className}`}>
      <AnimatePresence mode="wait">
        {isCompleted && animationStatus?.s3Url ? (
          <>
            {!isVideoLoaded && (
              <motion.div
                key="video-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100"
              >
                <div className="text-center">
                  <VideoIcon className="text-muted-foreground/60 mx-auto mb-3 h-10 w-10" />
                  <p className="text-muted-foreground text-sm font-medium">
                    Loading video...
                  </p>
                </div>
              </motion.div>
            )}
            {isVideoLoaded && (
              <motion.div
                key="video-complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full w-full cursor-pointer"
              >
                <video
                  src={animationStatus.s3Url}
                  className="h-full w-full object-cover"
                  crossOrigin="anonymous"
                  muted
                  loop
                  playsInline
                  onClick={handleVideoClick}
                  onLoadedData={handleVideoLoad}
                />
              </motion.div>
            )}
            {/* 隐藏的预加载视频 */}
            {!isVideoLoaded && (
              <video
                src={animationStatus.s3Url}
                className="hidden"
                crossOrigin="anonymous"
                muted
                preload="auto"
                onLoadedData={handleVideoLoad}
              />
            )}
          </>
        ) : isFailed ? (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-100 to-pink-100"
          >
            <div className="text-center">
              <AlertCircle className="text-destructive mx-auto mb-3 h-10 w-10" />
              <p className="text-destructive text-sm font-medium">
                Animation generation failed
              </p>
              {animationStatus?.errorMessage && (
                <p className="text-destructive/70 mt-2 text-xs">
                  {animationStatus.errorMessage}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex h-full w-full items-center justify-center"
          >
            {/* 背景层 - 只有背景进行 pulse 动画 */}
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-200/50 to-pink-200/80" />

            {/* 内容层 - 不受动画影响 */}
            <div className="relative z-10 text-center">
              <Spinner
                variant="ring"
                size={40}
                className="text-muted-foreground/60 mx-auto mb-3"
              />
              <p className="text-muted-foreground text-sm font-medium">
                {animationStatus?.status === 'processing'
                  ? 'Creating whiteboard animation...'
                  : 'Initializing animation...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
