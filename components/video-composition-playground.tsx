'use client'

import { AudioClip, Composition, VideoClip } from '@diffusionstudio/core'
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from './ui/button'

type PlaybackState = 'idle' | 'playing' | 'paused'

export function VideoCompositionPlayground() {
  const playerRef = useRef<HTMLDivElement>(null)
  const compositionRef = useRef<Composition | null>(null)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeComposition()
    return () => {
      if (compositionRef.current) {
        compositionRef.current.unmount()
      }
    }
  }, [])

  const initializeComposition = async () => {
    if (!playerRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // 创建 composition
      const composition = new Composition({
        width: 1280,
        height: 720,
        background: '#000000',
      })

      // 创建无声视频 clip
      const videoClip = new VideoClip('/videos/mxBy0DLpQho1RneC4g4jk_video.mp4')

      // 创建音频 clip
      const audioClip = new AudioClip(
        '/audios/doubao_tts_fast_voice_1750812273400.mp3',
      )

      // 添加 clips 到 composition
      await composition.add(videoClip)
      await composition.add(audioClip)

      // 挂载到 DOM
      composition.mount(playerRef.current)

      // 设置缩放
      setupPlayerScaling(composition)

      // 保存 composition 引用
      compositionRef.current = composition

      // 设置时长 - 转换 Timestamp 为 number
      const durationValue =
        typeof composition.duration === 'number'
          ? composition.duration
          : Number(composition.duration) || 0
      setDuration(durationValue)

      console.log('Composition initialized successfully:', {
        duration: composition.duration,
        layers: composition.layers?.length || 0,
      })
    } catch (err) {
      console.error('Failed to initialize composition:', err)
      setError(err instanceof Error ? err.message : '初始化失败')
    } finally {
      setIsLoading(false)
    }
  }

  const setupPlayerScaling = (composition: Composition) => {
    if (!playerRef.current) return

    const container = playerRef.current.parentElement
    if (!container) return

    const scale = Math.min(
      container.clientWidth / composition.width,
      container.clientHeight / composition.height,
    )

    playerRef.current.style.width = `${composition.width}px`
    playerRef.current.style.height = `${composition.height}px`
    playerRef.current.style.transform = `scale(${scale})`
    playerRef.current.style.transformOrigin = 'center'
  }

  const handlePlay = async () => {
    if (!compositionRef.current) return

    try {
      if (playbackState === 'playing') {
        await compositionRef.current.pause()
        setPlaybackState('paused')
      } else {
        await compositionRef.current.play()
        setPlaybackState('playing')

        // 启动时间更新
        startTimeUpdates()
      }
    } catch (err) {
      console.error('播放失败:', err)
      setError('播放失败')
    }
  }

  const handleReset = async () => {
    if (!compositionRef.current) return

    try {
      await compositionRef.current.pause()
      await compositionRef.current.seek(0)
      setPlaybackState('idle')
      setCurrentTime(0)
    } catch (err) {
      console.error('重置失败:', err)
    }
  }

  const startTimeUpdates = () => {
    const updateTime = () => {
      if (compositionRef.current && playbackState === 'playing') {
        const time = compositionRef.current.time()
        // 转换时间值为 number
        const timeValue = typeof time === 'number' ? time : Number(time) || 0
        setCurrentTime(timeValue)

        if (timeValue >= duration) {
          setPlaybackState('idle')
          return
        }

        requestAnimationFrame(updateTime)
      }
    }
    requestAnimationFrame(updateTime)
  }

  const formatTime = (frames: number) => {
    const seconds = Math.floor(frames / 30) // 假设 30fps
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* 播放器容器 */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="relative overflow-hidden rounded-lg bg-black shadow-2xl">
          {isLoading && (
            <div className="bg-opacity-75 absolute inset-0 z-10 flex items-center justify-center bg-black">
              <div className="text-white">加载中...</div>
            </div>
          )}
          {error && (
            <div className="bg-opacity-75 absolute inset-0 z-10 flex items-center justify-center bg-red-900">
              <div className="text-center text-white">
                <div className="mb-2 font-semibold">错误</div>
                <div className="text-sm">{error}</div>
                <Button
                  onClick={initializeComposition}
                  className="mt-4"
                  variant="outline"
                >
                  重试
                </Button>
              </div>
            </div>
          )}
          <div
            ref={playerRef}
            className="h-full min-h-[360px] w-full min-w-[640px]"
            style={{ aspectRatio: '16/9' }}
          />
        </div>
      </div>

      {/* 控制面板 */}
      <div className="border-t border-gray-700 bg-gray-800 p-6">
        <div className="mx-auto max-w-4xl">
          {/* 播放控制 */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <Button
              onClick={handlePlay}
              disabled={isLoading || !!error}
              size="lg"
              variant="default"
              className="h-12 w-12 rounded-full"
            >
              {playbackState === 'playing' ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoading || !!error}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          {/* 时间信息 */}
          <div className="flex items-center justify-center gap-4 text-white">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              状态:{' '}
              {playbackState === 'playing'
                ? '播放中'
                : playbackState === 'paused'
                  ? '已暂停'
                  : '就绪'}
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full bg-blue-600 transition-all duration-100"
                style={{
                  width:
                    duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                }}
              />
            </div>
          </div>

          {/* 信息面板 */}
          <div className="mt-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-gray-700 p-4">
              <h3 className="mb-2 font-semibold text-white">视频文件</h3>
              <p className="text-gray-300">mxBy0DLpQho1RneC4g4jk_video.mp4</p>
              <p className="mt-1 text-xs text-gray-400">无声视频</p>
            </div>
            <div className="rounded-lg bg-gray-700 p-4">
              <h3 className="mb-2 font-semibold text-white">音频文件</h3>
              <p className="text-gray-300">
                doubao_tts_fast_voice_1750812273400.mp3
              </p>
              <p className="mt-1 text-xs text-gray-400">TTS 语音</p>
            </div>
            <div className="rounded-lg bg-gray-700 p-4">
              <h3 className="mb-2 font-semibold text-white">合成信息</h3>
              <p className="text-gray-300">1280x720 @ 30fps</p>
              <p className="mt-1 text-xs text-gray-400">实时预览</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
