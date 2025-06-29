'use client'

import type { StoryAssets } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'
import { getMediaUrl } from '@/lib/media-proxy'
import { client } from '@/lib/rpc/orpc.client'
import * as core from '@diffusionstudio/core'
import { use$, useMount } from '@legendapp/state/react'
import { useEffect, useRef } from 'react'
import { useHover, useResizeObserver } from 'usehooks-ts'

import { PlaybackControls } from './playback-controls'
import { useVideoComposer } from './video-composer-provider'

// 新的合成数据结构
type CompositionShot = {
  shotId: string
  sceneId: string
  title: string
  audioUrl: string
  audioDuration?: number // 秒
  whiteboardVideoUrl?: string // 白板动画视频URL（可选，如果没有则只有音频）
}

type VideoPlayerProps = {
  storyAssets?: StoryAssets
  storyId?: string // 新增：用于查询实际的资产数据
}

export function VideoPlayer({ storyAssets, storyId }: VideoPlayerProps) {
  const { state$, composition, attachPlayer, updatePlayerScale } =
    useVideoComposer()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const isHovered = useHover(containerRef)

  const playerScale = use$(state$.playerScale)
  const isLoading = use$(state$.isLoading)

  useEffect(() => {
    if (playerRef.current) {
      attachPlayer(playerRef.current)
    }
  }, [])

  useSetupComposition(composition, storyAssets, storyId)

  useResizeObserver({
    ref: containerRef,
    onResize: ({ width, height }) => {
      if (composition && width && height) {
        updatePlayerScale(width, height)
      }
    },
  })

  if (isLoading) {
    return (
      <div
        className="relative mx-auto flex aspect-video w-full items-center justify-center overflow-hidden bg-black/30"
        ref={containerRef}
      >
        <div className="text-muted-foreground text-xl">
          Loading composition...
        </div>

        {/* Floating Controls */}
        <div
          className={`bg-background absolute right-0 bottom-0 left-0 p-3 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <PlaybackControls />
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative mx-auto flex aspect-video w-full items-center justify-center overflow-hidden bg-black/30"
      ref={containerRef}
    >
      <div
        ref={playerRef}
        style={{
          width: composition ? `${composition.width}px` : '1920px',
          height: composition ? `${composition.height}px` : '1080px',
          transform: `scale(${playerScale})`,
          transformOrigin: 'center',
        }}
      />

      {/* Floating Controls */}
      <div
        className={`bg-background absolute right-0 bottom-0 left-0 p-3 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <PlaybackControls />
      </div>
    </div>
  )
}

function useSetupComposition(
  composition: core.Composition,
  _storyAssets?: StoryAssets, // 保留参数但标记为未使用
  storyId?: string,
) {
  const isInit = useRef(false)

  useMount(async function init() {
    if (isInit.current) return
    isInit.current = true

    console.log(
      '🎬 [VideoComposer] Setting up composition with story ID:',
      storyId,
    )

    if (!storyId) {
      console.warn('🎬 [VideoComposer] No story ID provided, using test assets')
      await setupDemoComposition(composition)
      return
    }

    // 查询并组装真实的合成数据
    const compositionShots = await fetchCompositionData(storyId)
    if (compositionShots.length === 0) {
      console.warn(
        '🎬 [VideoComposer] No composition data found, using test assets',
      )
      await setupDemoComposition(composition)
      return
    }

    await setupRealComposition(composition, compositionShots)
  })
}

async function setupDemoComposition(composition: core.Composition) {
  console.log('🎬 [VideoComposer] Setting up demo composition')

  // Add video clip using new v3 API
  const videoSource = await core.Source.from<core.VideoSource>(
    '/sample_aac_h264_yuv420p_1080p_60fps.mp4',
  )
  const video = new core.VideoClip(videoSource, {
    volume: 0.1,
    position: 'center',
    height: '100%',
  })
  video.subclip(30, 540).offset(30)
  await composition.add(video)

  // Add image using new v3 API
  const image = new core.ImageClip('/lenna.png', {
    position: 'center',
    height: 600,
    delay: 0,
    duration: 300,
  })
  await composition.add(image)

  // Add audio clip using new v3 API
  const audioSource = await core.Source.from<core.AudioSource>('/harvard.MP3')
  const audioClip = new core.AudioClip(audioSource)
  await composition.add(audioClip)

  // Add text clips using new v3 API
  const textClip = new core.TextClip({
    text: 'Basic text in Diffusion Studio',
    duration: 120,
    align: 'center',
    baseline: 'middle',
    x: composition.width / 2,
    y: composition.height * 0.15,
    color: '#ffffff',
    stroke: {
      width: 3,
      color: '#000000',
    },
  })
  await composition.add(textClip)
}

// 从数据库查询并组装合成数据
async function fetchCompositionData(
  storyId: string,
): Promise<CompositionShot[]> {
  try {
    console.log(
      '🎬 [VideoComposer] Fetching composition data for story:',
      storyId,
    )

    // 使用 client 实例直接调用后端API
    const data = await client.getAnimationAsset({ storyId })
    console.log('🎬 [VideoComposer] Raw asset data:', data)

    // 组装合成镜头数据（按 scenes -> shots 的有序结构）
    const shots: CompositionShot[] = []
    const assetsByScene = data.assetsByScene || {}

    // 按场景ID排序（现在 sceneId 是字符串，但仍然可以按数字排序）
    const sceneIds = Object.keys(assetsByScene).sort(
      (a, b) => parseInt(a) - parseInt(b),
    )

    for (const sceneId of sceneIds) {
      const sceneAssets = assetsByScene[sceneId]

      // 检查是否有音频
      if (!sceneAssets.audio || sceneAssets.audio.status !== 'completed') {
        console.warn(
          `🎬 [VideoComposer] Scene ${sceneId} missing completed audio, skipping`,
        )
        continue
      }

      // 查找白板动画
      const whiteboardAsset = sceneAssets.whiteboardAnimation

      // 检查白板动画是否完成（如果没有白板动画，仍然可以添加音频）
      if (!whiteboardAsset || whiteboardAsset.status !== 'completed') {
        console.warn(
          `🎬 [VideoComposer] Scene ${sceneId} whiteboard animation not ready, will only add audio`,
        )
      }

      // 创建镜头数据（每个场景对应一个镜头）
      const shot: CompositionShot = {
        shotId: `${sceneId}-1`, // 场景ID + 镜头编号（保持字符串格式）
        sceneId: sceneId, // 确保 sceneId 是字符串
        title: `Scene ${sceneId}`, // 可以从story数据中获取真实标题
        audioUrl: sceneAssets.audio.s3Url,
        audioDuration: sceneAssets.audio.duration
          ? parseFloat(sceneAssets.audio.duration)
          : undefined,
        whiteboardVideoUrl:
          whiteboardAsset?.status === 'completed'
            ? whiteboardAsset.s3Url
            : undefined,
      }

      shots.push(shot)
      console.log(`🎬 [VideoComposer] Added shot ${shot.shotId}:`, {
        shotId: shot.shotId,
        audioUrl: shot.audioUrl,
        audioDuration: shot.audioDuration,
        whiteboardVideoUrl: shot.whiteboardVideoUrl,
        audioProxyUrl: shot.audioUrl ? getMediaUrl(shot.audioUrl) : 'N/A',
        videoProxyUrl: shot.whiteboardVideoUrl
          ? getMediaUrl(shot.whiteboardVideoUrl)
          : 'N/A',
      })
    }

    console.log(
      `🎬 [VideoComposer] Assembled ${shots.length} shots for composition`,
    )
    return shots
  } catch (error) {
    console.error('🎬 [VideoComposer] Error fetching composition data:', error)
    return []
  }
}

// 使用真实数据设置合成
async function setupRealComposition(
  composition: core.Composition,
  shots: CompositionShot[],
) {
  console.log(
    '🎬 [VideoComposer] Setting up real composition with',
    shots.length,
    'shots',
  )

  // 创建 sequential layers 来确保音频和视频按顺序播放
  const audioLayer = composition.createLayer().sequential()
  const videoLayer = composition.createLayer().sequential()

  console.log(
    '🎬 [VideoComposer] Created sequential layers for audio and video',
  )

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]
    console.log(
      `🎬 [VideoComposer] Processing shot ${shot.shotId}: "${shot.title}"`,
    )

    try {
      // 先验证 S3 文件是否可访问
      console.log(`🔍 [VideoComposer] Verifying audio URL:`, shot.audioUrl)
      try {
        const audioResponse = await fetch(shot.audioUrl, { method: 'HEAD' })
        console.log(`🎵 [VideoComposer] Audio URL status:`, {
          status: audioResponse.status,
          contentType: audioResponse.headers.get('content-type'),
          contentLength: audioResponse.headers.get('content-length'),
          url: shot.audioUrl,
        })
      } catch (fetchError) {
        console.error(
          `❌ [VideoComposer] Cannot access audio URL:`,
          shot.audioUrl,
          fetchError,
        )
      }

      // 添加音频到 sequential audio layer
      const audioProxyUrl = getMediaUrl(shot.audioUrl)
      console.log(
        `🎵 [VideoComposer] Adding audio:`,
        shot.audioUrl,
        '-> proxy:',
        audioProxyUrl,
      )
      const audioClip = new core.AudioClip(audioProxyUrl)
      await audioLayer.add(audioClip)

      // 添加白板动画视频（如果存在）
      if (shot.whiteboardVideoUrl) {
        const videoProxyUrl = getMediaUrl(shot.whiteboardVideoUrl)
        console.log(
          `🎬 [VideoComposer] Adding whiteboard animation (muted):`,
          shot.whiteboardVideoUrl,
          '-> proxy:',
          videoProxyUrl,
        )
        const videoClip = new core.VideoClip(videoProxyUrl, {
          position: 'center',
          height: '100%',
          volume: 0, // 确保白板动画视频无声
        })
        await videoLayer.add(videoClip)
      } else {
        console.warn(
          `🎬 [VideoComposer] Shot ${shot.shotId} has no whiteboard animation`,
        )
      }

      console.log(`✅ [VideoComposer] Shot ${shot.shotId} added successfully`)
    } catch (error) {
      console.error(
        `🎬 [VideoComposer] Error processing shot ${shot.shotId}:`,
        error,
      )
    }
  }

  // 计算并设置合成的总时长
  try {
    const totalDurationSeconds = audioLayer.clips.reduce((acc, clip) => {
      return acc + clip.duration.seconds
    }, 0)
    const totalDuration = new core.Timestamp(0, totalDurationSeconds)

    if (!(totalDurationSeconds > 0)) {
      console.error(
        '🎬 [VideoComposer] Total duration is 0, setting to 30 seconds',
      )
      throw new Error('Total duration is 0')
    }

    console.log(
      `🎬 [VideoComposer] Setting composition duration to ${totalDuration.seconds} seconds`,
    )

    composition.duration = new core.Timestamp(0, 30)
  } catch (error) {
    console.error(
      '🎬 [VideoComposer] Error setting composition duration:',
      error,
    )
  }

  console.log(
    '🎬 [VideoComposer] Real composition setup complete using sequential layers',
  )
}
