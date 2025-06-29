import { Slider } from '@/components/ui/slider'
import { use$ } from '@legendapp/state/react'

import { useVideoComposer } from './video-composer-provider'

export function Timeline() {
  const { state$, seekToFrame } = useVideoComposer()

  const currentFrame = use$(state$.currentFrame)
  const duration = use$(state$.duration)

  const handleValueChange = (values: number[]) => {
    const targetFrame = values[0] || 0
    seekToFrame(targetFrame)
  }

  return (
    <div className="mb-3">
      <Slider
        value={[currentFrame]}
        onValueChange={handleValueChange}
        max={duration}
        min={0}
        step={1}
        className="w-full"
      />
    </div>
  )
}
