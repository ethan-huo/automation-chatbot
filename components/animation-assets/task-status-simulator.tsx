'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ImageZoom } from '@/components/ui/kibo-ui/image-zoom'
import { Progress } from '@/components/ui/progress'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ImageIcon,
  PlayIcon,
  RotateCcwIcon,
  VideoIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

type TaskStatus = 'pending' | 'complete'

type ImageTask = {
  type: 'image'
  task_id: string
  status: TaskStatus
  url?: string
}

type VideoTask = {
  type: 'video'
  task_id: string
  status: TaskStatus
  url?: string
}

type Task = ImageTask | VideoTask

export default function Component() {
  const [imageTask, setImageTask] = useState<ImageTask>({
    type: 'image',
    task_id: 'img_001',
    status: 'pending',
  })

  const [videoTask, setVideoTask] = useState<VideoTask | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  // 生成随机图片URL
  const getRandomImageUrl = () => {
    const timestamp = Date.now()
    return `https://picsum.photos/400/300?random=${timestamp}`
  }

  const getRandomVideoUrl = () => {
    return `https://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/high.mp4`
  }

  // 模拟任务状态变化
  const simulateTaskFlow = async () => {
    setIsRunning(true)

    // 重置状态
    const newImageTaskId = `img_${Date.now()}`
    setImageTask({
      type: 'image',
      task_id: newImageTaskId,
      status: 'pending',
    })
    setVideoTask(null)

    // 模拟图片生成过程 (3秒)
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const imageUrl = getRandomImageUrl()
    setImageTask((prev) => ({
      ...prev,
      status: 'complete',
      url: imageUrl,
    }))

    // 图片完成后，启动视频任务
    await new Promise((resolve) => setTimeout(resolve, 800))

    const newVideoTask: VideoTask = {
      type: 'video',
      task_id: `vid_${Date.now()}`,
      status: 'pending',
    }
    setVideoTask(newVideoTask)

    // 模拟视频生成过程 (6秒) - 延长时间以便观察模糊效果
    await new Promise((resolve) => setTimeout(resolve, 6000))

    setVideoTask((prev) =>
      prev
        ? {
            ...prev,
            status: 'complete',
            url: getRandomVideoUrl(),
          }
        : null,
    )

    setIsRunning(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Asset Generation Studio</h1>
        <p className="text-muted-foreground">
          Experience the complete workflow from image creation to video
          generation
        </p>
        <Button
          onClick={simulateTaskFlow}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning ? (
            <RotateCcwIcon className="h-4 w-4 animate-spin" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
          {isRunning ? 'Generating...' : 'Start Simulation'}
        </Button>
      </div>

      {/* 紧凑布局 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Asset Preview</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TaskCard task={imageTask} />
          {videoTask && <TaskCard task={videoTask} imageUrl={imageTask.url} />}
        </div>
      </section>

      {/* 时间线显示 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Progress Timeline</h2>
        <TimelineDisplay imageTask={imageTask} videoTask={videoTask} />
      </section>
    </div>
  )
}

// 单个任务卡片组件
function TaskCard({ task, imageUrl }: { task: Task; imageUrl?: string }) {
  const isPending = task.status === 'pending'
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)

  const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleMediaLoad = () => {
    setIsMediaLoaded(true)
  }

  // 当任务状态变化时重置加载状态
  useEffect(() => {
    if (task.status === 'pending') {
      setIsMediaLoaded(false)
    }
  }, [task.status])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full overflow-hidden p-0">
        {/* 图片内容区域 - 充满剩余空间 */}
        <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {isPending ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative h-full w-full"
              >
                {/* 视频生成时显示模糊的源图片 */}
                {task.type === 'video' && imageUrl ? (
                  <div className="relative h-full w-full">
                    <img
                      src={imageUrl || '/placeholder.svg'}
                      alt="Source image"
                      className="h-full w-full object-cover opacity-60 blur-md"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 flex animate-pulse items-center justify-center">
                      <div className="text-center">
                        <VideoIcon className="mx-auto mb-3 h-10 w-10 text-white" />
                        <p className="text-sm font-medium text-white">
                          Creating video...
                        </p>
                        <p className="mt-1 text-xs text-white/80">
                          Based on source image
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 图片生成时的脉冲动画 */
                  <div className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                    <div className="text-center">
                      <ImageIcon className="text-muted-foreground/60 mx-auto mb-3 h-10 w-10" />
                      <p className="text-muted-foreground text-sm font-medium">
                        Generating image...
                      </p>
                      <p className="text-muted-foreground/80 mt-1 text-xs">
                        AI crafting in progress
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : task.type === 'image' ? (
              <AnimatePresence mode="wait">
                {!isMediaLoaded && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100"
                  >
                    <div className="text-center">
                      <ImageIcon className="text-muted-foreground/60 mx-auto mb-3 h-10 w-10" />
                      <p className="text-muted-foreground text-sm font-medium">
                        Loading image...
                      </p>
                    </div>
                  </motion.div>
                )}
                {isMediaLoaded && (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full w-full"
                  >
                    <ImageZoom>
                      <img
                        src={task.url}
                        alt="Generated image"
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                        onLoad={handleMediaLoad}
                        style={{ display: isMediaLoaded ? 'block' : 'none' }}
                      />
                    </ImageZoom>
                  </motion.div>
                )}
                {/* 隐藏的预加载图片 */}
                {!isMediaLoaded && task.url && (
                  <img
                    src={task.url}
                    alt=""
                    className="hidden"
                    crossOrigin="anonymous"
                    onLoad={handleMediaLoad}
                  />
                )}
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                {!isMediaLoaded && (
                  <motion.div
                    key="loading"
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
                {isMediaLoaded && (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full w-full cursor-pointer"
                  >
                    <video
                      src={task.url}
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                      muted
                      loop
                      playsInline
                      onClick={handleVideoClick}
                      onLoadedData={handleMediaLoad}
                      style={{ display: isMediaLoaded ? 'block' : 'none' }}
                    />
                  </motion.div>
                )}
                {/* 隐藏的预加载视频 */}
                {!isMediaLoaded && task.url && (
                  <video
                    src={task.url}
                    className="hidden"
                    crossOrigin="anonymous"
                    muted
                    preload="auto"
                    onLoadedData={handleMediaLoad}
                  />
                )}
              </AnimatePresence>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}

// 时间线显示组件
function TimelineDisplay({
  imageTask,
  videoTask,
}: {
  imageTask: ImageTask
  videoTask: VideoTask | null
}) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  const handleTimelineVideoClick = (
    event: React.MouseEvent<HTMLVideoElement>,
  ) => {
    const video = event.currentTarget
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleImageLoad = () => {
    setIsImageLoaded(true)
  }

  const handleVideoLoad = () => {
    setIsVideoLoaded(true)
  }

  // 当任务状态变化时重置加载状态
  useEffect(() => {
    if (imageTask.status === 'pending') {
      setIsImageLoaded(false)
    }
  }, [imageTask.status])

  useEffect(() => {
    if (videoTask?.status === 'pending') {
      setIsVideoLoaded(false)
    }
  }, [videoTask?.status])

  const getProgress = () => {
    if (imageTask.status === 'pending') return 25
    if (imageTask.status === 'complete' && !videoTask) return 50
    if (videoTask?.status === 'pending') return 75
    if (videoTask?.status === 'complete') return 100
    return 0
  }

  const getStatusText = () => {
    if (imageTask.status === 'pending') return 'Generating image...'
    if (imageTask.status === 'complete' && !videoTask)
      return 'Image complete, preparing video generation'
    if (videoTask?.status === 'pending') return 'Creating video...'
    if (videoTask?.status === 'complete') return 'All tasks completed'
    return 'Ready to begin'
  }

  return (
    <Card>
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Task Progress</h3>
            <span className="text-muted-foreground text-sm">
              {getProgress()}%
            </span>
          </div>
          <Progress value={getProgress()} className="w-full" />
          <p className="text-muted-foreground text-sm">{getStatusText()}</p>

          <div className="space-y-4">
            {/* 图片任务步骤 */}
            <div className="flex items-start gap-3">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  imageTask.status === 'complete'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
              >
                {imageTask.status === 'complete' ? (
                  <CheckCircleIcon className="h-3 w-3 text-white" />
                ) : (
                  <ImageIcon className="h-3 w-3 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium">Image Generation</h4>
                {imageTask.status === 'complete' && imageTask.url && (
                  <AnimatePresence mode="wait">
                    {!isImageLoaded && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                      >
                        <div className="flex h-15 w-20 animate-pulse items-center justify-center rounded border bg-gradient-to-br from-blue-100 to-purple-100">
                          <ImageIcon className="text-muted-foreground/60 h-4 w-4" />
                        </div>
                      </motion.div>
                    )}
                    {isImageLoaded && (
                      <motion.div
                        key="complete"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2"
                      >
                        <ImageZoom>
                          <img
                            src={imageTask.url}
                            alt="Generated image"
                            className="h-15 w-20 rounded border object-cover"
                            crossOrigin="anonymous"
                            onLoad={handleImageLoad}
                          />
                        </ImageZoom>
                      </motion.div>
                    )}
                    {/* 隐藏的预加载图片 */}
                    {!isImageLoaded && (
                      <img
                        src={imageTask.url}
                        alt=""
                        className="hidden"
                        crossOrigin="anonymous"
                        onLoad={handleImageLoad}
                      />
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* 连接线 */}
            {videoTask && <div className="bg-border ml-3 h-4 w-px"></div>}

            {/* 视频任务步骤 */}
            {videoTask && (
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    videoTask.status === 'complete'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                >
                  {videoTask.status === 'complete' ? (
                    <CheckCircleIcon className="h-3 w-3 text-white" />
                  ) : (
                    <VideoIcon className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium">Video Generation</h4>
                  {videoTask.status === 'complete' && videoTask.url && (
                    <AnimatePresence mode="wait">
                      {!isVideoLoaded && (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2"
                        >
                          <div className="flex h-15 w-20 animate-pulse items-center justify-center rounded border bg-gradient-to-br from-purple-100 to-pink-100">
                            <VideoIcon className="text-muted-foreground/60 h-4 w-4" />
                          </div>
                        </motion.div>
                      )}
                      {isVideoLoaded && (
                        <motion.div
                          key="complete"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2"
                        >
                          <video
                            src={videoTask.url}
                            className="h-15 w-20 cursor-pointer rounded border object-cover"
                            crossOrigin="anonymous"
                            muted
                            loop
                            playsInline
                            onClick={handleTimelineVideoClick}
                            onLoadedData={handleVideoLoad}
                          />
                        </motion.div>
                      )}
                      {/* 隐藏的预加载视频 */}
                      {!isVideoLoaded && (
                        <video
                          src={videoTask.url}
                          className="hidden"
                          crossOrigin="anonymous"
                          muted
                          preload="auto"
                          onLoadedData={handleVideoLoad}
                        />
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
