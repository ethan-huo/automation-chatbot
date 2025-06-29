'use client'

import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'

// video-composer-app
const VideoComposerApp = dynamic(
  () =>
    import('@/components/video-composer/video-composer-app').then((mod) => ({
      default: mod.VideoComposerApp,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="aspect-video w-full rounded-md" />
        <Skeleton className="h-2 w-full rounded-sm" />
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
        </div>
      </div>
    ),
  },
)

export default function Page() {
  return (
    <div className="bg-background min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="text-center">
          <h1 className="text-foreground mb-2 text-3xl font-bold">
            Video Composer Playground
          </h1>
          <p className="text-muted-foreground">
            测试 Video Composer 组件的 CSS Modules 实现
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <VideoComposerApp />
        </div>
      </div>
    </div>
  )
}
