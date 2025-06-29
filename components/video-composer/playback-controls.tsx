import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { use$ } from '@legendapp/state/react'

import { useVideoComposer } from './video-composer-provider'

export function PlaybackControls() {
  const {
    state$,
    composition,
    seekToStart,
    seekToEnd,
    exportVideo,
    setFps,
    seekToFrame,
  } = useVideoComposer()

  const isPlaying = use$(state$.isPlaying)
  const currentTime = use$(state$.currentTime)
  const currentFrame = use$(state$.currentFrame)
  const duration = use$(state$.duration)
  const fps = use$(state$.fps)
  const isRendering = use$(state$.renderProgress.isRendering)

  const handleFpsChange = () => {
    const value = parseFloat(
      prompt('Please enter the desired frame rate', fps.toString()) ??
        fps.toString(),
    )

    if (!Number.isNaN(value)) {
      setFps(value)
    }
  }

  const handleTimelineChange = (value: number[]) => {
    seekToFrame(value[0])
  }

  return (
    <div className="flex h-9 items-center gap-3">
      {/* Left: Play Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={seekToStart}
          title="Skip to start"
          className="size-7 p-0"
        >
          <SkipBackIcon />
        </Button>

        {isPlaying ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => composition.pause()}
            title="Pause"
            className="size-7 p-0"
          >
            <PauseIcon />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => composition.play()}
            title="Play"
            className="size-7 p-0"
          >
            <PlayIcon />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={seekToEnd}
          title="Skip to end"
          className="size-7 p-0"
        >
          <SkipForwardIcon />
        </Button>
      </div>

      {/* Center: Timeline */}
      <div className="flex flex-1 items-center gap-2">
        <Slider
          value={[currentFrame]}
          onValueChange={handleTimelineChange}
          max={duration}
          min={0}
          step={1}
          className="flex-1"
        />
        <span className="text-foreground text-sm font-semibold whitespace-nowrap">
          {currentTime}
        </span>
      </div>

      {/* Right: Action Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFpsChange}
          title="Set FPS"
          className="h-7 px-2 text-xs"
        >
          <GaugeIcon />
          {fps} FPS
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={exportVideo}
          disabled={isRendering}
          title="Export video"
          className="h-7 px-3 text-xs"
        >
          Export
        </Button>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="6,3 20,12 6,21" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="14" y="4" width="4" height="16" />
      <rect x="6" y="4" width="4" height="16" />
    </svg>
  )
}

function SkipBackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="19,20 9,12 19,4" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  )
}

function SkipForwardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="5,4 15,12 5,20" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}

function GaugeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  )
}
