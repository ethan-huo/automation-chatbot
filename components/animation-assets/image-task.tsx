'use client'

import type { AnimationAssetTask } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'
import { ImageZoom } from '@/components/ui/kibo-ui/image-zoom'
import { AnimatePresence, motion } from 'framer-motion'
import { ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

type ImageTaskProps = {
  task: AnimationAssetTask
  index: number
}

export function ImageTask({ task, index }: ImageTaskProps) {
  const status = task.status
  const imageUrl = task.image_url
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  const handleImageLoad = () => {
    setIsImageLoaded(true)
  }

  // 当任务状态变化时重置加载状态
  useEffect(() => {
    if (status !== 'completed') {
      setIsImageLoaded(false)
    }
  }, [status])

  return (
    <div className="h-full w-full">
      <div className="h-full w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {status === 'completed' && imageUrl ? (
            <>
              {!isImageLoaded && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100"
                >
                  <div className="text-center">
                    <ImageIcon className="text-muted-foreground/60 mx-auto mb-1 h-4 w-4" />
                    <p className="text-muted-foreground text-xs">Loading...</p>
                  </div>
                </motion.div>
              )}
              {isImageLoaded && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full w-full"
                >
                  <ImageZoom>
                    <img
                      src={imageUrl}
                      alt={`Generated image ${task.task_id}`}
                      className="h-full w-full cursor-pointer object-cover"
                      onLoad={handleImageLoad}
                      onError={(e) => {
                        e.currentTarget.src = `data:image/svg+xml;base64,${btoa(`
                          <svg width="128" height="80" xmlns="http://www.w3.org/2000/svg">
                            <rect width="128" height="80" fill="#f3f4f6"/>
                            <text x="64" y="45" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="10">
                              Image ${task.task_id}
                            </text>
                          </svg>
                        `)}`
                      }}
                    />
                  </ImageZoom>
                </motion.div>
              )}
              {/* 隐藏的预加载图片 */}
              {!isImageLoaded && (
                <img
                  src={imageUrl}
                  alt=""
                  className="hidden"
                  onLoad={handleImageLoad}
                />
              )}
            </>
          ) : (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100"
            >
              <div className="text-center">
                <ImageIcon className="text-muted-foreground/60 mx-auto mb-1 h-4 w-4" />
                <p className="text-muted-foreground text-xs">
                  {status === 'pending' ? 'Generating...' : 'AI crafting...'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
