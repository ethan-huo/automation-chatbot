import { createContextProvider } from '@/lib/create-context-provider'
import * as core from '@diffusionstudio/core'
import { observable } from '@legendapp/state'

type VideoComposerState = {
  isPlaying: boolean
  currentTime: string
  currentFrame: number
  duration: number
  isLoading: boolean
  renderProgress: {
    isRendering: boolean
    progress: number
    total: number
  }
  playerScale: number
  fps: number
}

export const [VideoComposerProvider, useVideoComposer] = createContextProvider(
  () => {
    const composition = new core.Composition({ background: '#000000' })

    const state$ = observable<VideoComposerState>({
      isPlaying: false,
      currentTime: '00:00:00',
      currentFrame: 0,
      duration: 0,
      isLoading: false,
      renderProgress: {
        isRendering: false,
        progress: 0,
        total: 0,
      },
      playerScale: 1,
      fps: 30,
    })

    const seekToStart = async () => {
      await composition.seek('0s')
    }

    const seekToEnd = async () => {
      const duration = state$.duration.peek()
      await composition.seek(`${duration / 30}s`) // Convert frames to seconds
    }

    const seekToFrame = async (frame: number) => {
      await composition.seek(`${frame / 30}s`) // Convert frames to seconds
    }
    function mount() {
      composition.on('play', () => {
        state$.isPlaying.set(true)
      })

      composition.on('pause', () => {
        state$.isPlaying.set(false)
      })

      composition.on('currentframe', (event) => {
        state$.currentTime.set(composition.time())
        state$.currentFrame.set(event.detail || 0)
      })

      state$.duration.set(600) // Set a default duration
      state$.currentTime.set(composition.time())

      // Initial seek to frame 0
      composition.seek(0)
    }
    const attachPlayer = (playerElement: HTMLDivElement) => {
      composition.mount(playerElement)
      mount()
    }

    const updatePlayerScale = (
      containerWidth: number,
      containerHeight: number,
    ) => {
      const scale = Math.min(
        containerWidth / composition.width,
        containerHeight / composition.height,
      )
      state$.playerScale.set(scale)
    }

    const exportVideo = async () => {
      if (state$.renderProgress.isRendering.peek())
        return console.warn('Already rendering')

      try {
        const fps = state$.fps.peek()
        const encoder = new core.Encoder(composition as any, {
          video: { fps },
        })

        encoder.on('render', (event) => {
          const { progress, total } = event.detail
          state$.renderProgress.assign({
            isRendering: true,
            progress,
            total,
          })
        })

        if (!(window as any).showSaveFilePicker) {
          alert('File System Access API is not supported in this browser')
          return
        }

        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: `untitled_video.mp4`,
          types: [
            {
              description: 'Video File',
              accept: { 'video/mp4': ['.mp4'] },
            },
          ],
        })

        await encoder.render(fileHandle)
      } catch (e) {
        if (e instanceof DOMException) {
          console.log(e)
        } else if (e instanceof core.EncoderError) {
          alert(e.message)
        } else {
          alert(String(e))
        }
      } finally {
        state$.renderProgress.assign({
          isRendering: false,
          progress: 0,
          total: 0,
        })
      }
    }

    const setFps = (fps: number) => {
      state$.fps.set(fps)
    }

    return {
      state$,
      composition,
      seekToStart,
      seekToEnd,
      seekToFrame,
      attachPlayer,
      updatePlayerScale,
      exportVideo,
      setFps,
    }
  },
  'VideoComposer',
)
