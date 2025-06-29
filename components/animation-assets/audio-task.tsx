'use client'

import type { AnimationAssetTask } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'
import { Spinner } from '@/components/ui/kibo-ui/spinner'

type AudioTaskProps = {
  task: AnimationAssetTask
}

export function AudioTask({ task }: AudioTaskProps) {
  const status = task.status
  const audioUrl = task.audio_url

  return (
    <div className="flex items-center gap-2">
      {status === 'pending' && (
        <Spinner variant="ellipsis" size={16} className="text-gray-400" />
      )}
      {status === 'completed' && audioUrl ? (
        <audio controls className="h-8 w-full">
          <source src={audioUrl} type="audio/mpeg" />
          Your browser does not support audio playback.
        </audio>
      ) : status === 'pending' ? (
        <span className="text-muted-foreground mx-2 text-sm">
          Generating audio...
        </span>
      ) : (
        <span className="text-muted-foreground mx-2 text-sm">
          <Spinner variant="bars" size={16} className="text-gray-400" />
        </span>
      )}
    </div>
  )
}
