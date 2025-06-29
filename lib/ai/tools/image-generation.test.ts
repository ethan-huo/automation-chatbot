import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAndUploadImages } from './image-generation'
import * as midjourney from '@/integration/302/midjourney'
import * as blob from '@/lib/blob'
import * as imageUtils from '@/lib/image'

// Mock dependencies
vi.mock('@/integration/302/midjourney')
vi.mock('@/lib/blob')
vi.mock('@/lib/image')

const mockImagine = vi.mocked(midjourney.imagine)
const mockWatch = vi.mocked(midjourney.watch)
const mockPut = vi.mocked(blob.put)
const mockSplitImageToQuadrantArray = vi.mocked(imageUtils.splitImageToQuadrantArray)

// Mock fetch globally
global.fetch = vi.fn()

describe('Image Generation with Quadrant Splitting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate and split Midjourney 4-grid image into quadrants', async () => {
    // Mock Midjourney imagine response
    mockImagine.mockReturnValue({
      subscribe: vi.fn((observer) => {
        observer.next({ code: 1, result: 'test-task-id' })
        observer.complete()
      }),
    } as any)

    // Mock Midjourney watch response
    mockWatch.mockReturnValue({
      subscribe: vi.fn((observer) => {
        observer.next({
          status: 'SUCCESS',
          imageUrl: 'https://example.com/midjourney-grid.png',
          imageWidth: 2048,
          imageHeight: 2048,
          promptEn: 'test prompt',
        })
        observer.complete()
      }),
    } as any)

    // Mock fetch response for downloading image
    const mockImageBuffer = new ArrayBuffer(1024)
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer),
    } as Response)

    // Mock image splitting
    const mockQuadrant1 = Buffer.from('quadrant1')
    const mockQuadrant2 = Buffer.from('quadrant2')
    const mockQuadrant3 = Buffer.from('quadrant3')
    const mockQuadrant4 = Buffer.from('quadrant4')
    
    mockSplitImageToQuadrantArray.mockResolvedValue([
      mockQuadrant1,
      mockQuadrant2,
      mockQuadrant3,
      mockQuadrant4,
    ])

    // Mock S3 uploads
    mockPut
      .mockResolvedValueOnce({
        url: 'https://test-bucket.r2.cloudflarestorage.com/images/scene-1-1.png',
        pathname: 'images/scene-1-1.png',
        contentType: 'image/png',
        contentDisposition: 'inline; filename="scene-1-1.png"',
        size: 256,
      })
      .mockResolvedValueOnce({
        url: 'https://test-bucket.r2.cloudflarestorage.com/images/scene-1-2.png',
        pathname: 'images/scene-1-2.png',
        contentType: 'image/png',
        contentDisposition: 'inline; filename="scene-1-2.png"',
        size: 256,
      })
      .mockResolvedValueOnce({
        url: 'https://test-bucket.r2.cloudflarestorage.com/images/scene-1-3.png',
        pathname: 'images/scene-1-3.png',
        contentType: 'image/png',
        contentDisposition: 'inline; filename="scene-1-3.png"',
        size: 256,
      })
      .mockResolvedValueOnce({
        url: 'https://test-bucket.r2.cloudflarestorage.com/images/scene-1-4.png',
        pathname: 'images/scene-1-4.png',
        contentType: 'image/png',
        contentDisposition: 'inline; filename="scene-1-4.png"',
        size: 256,
      })

    const result = await generateAndUploadImages({
      prompt: 'A futuristic computer lab with quantum processors',
      storyId: 'test-story-id',
      sceneId: '1',
      options: {
        botType: 'MID_JOURNEY',
      },
    })

    expect(result.success).toBe(true)
    expect(result.s3Urls).toHaveLength(4)
    expect(result.s3Keys).toHaveLength(4)
    expect(result.taskId).toBe('test-task-id')

    // Verify Midjourney API was called
    expect(mockImagine).toHaveBeenCalledWith(
      {
        botType: 'MID_JOURNEY',
        prompt: 'A futuristic computer lab with quantum processors',
      },
      expect.any(Object),
    )

    // Verify image was downloaded
    expect(fetch).toHaveBeenCalledWith('https://example.com/midjourney-grid.png')

    // Verify image was split into quadrants
    expect(mockSplitImageToQuadrantArray).toHaveBeenCalledWith(
      Buffer.from(mockImageBuffer),
    )

    // Verify all 4 quadrants were uploaded to S3
    expect(mockPut).toHaveBeenCalledTimes(4)
    expect(mockPut).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('images/story-test-story-id/scene-1-1-'),
      mockQuadrant1,
      {
        contentType: 'image/png',
        access: 'public',
        addRandomSuffix: false,
      },
    )
    expect(mockPut).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('images/story-test-story-id/scene-1-2-'),
      mockQuadrant2,
      {
        contentType: 'image/png',
        access: 'public',
        addRandomSuffix: false,
      },
    )
  })

  it('should handle image download failure', async () => {
    mockImagine.mockReturnValue({
      subscribe: vi.fn((observer) => {
        observer.next({ code: 1, result: 'test-task-id' })
        observer.complete()
      }),
    } as any)

    mockWatch.mockReturnValue({
      subscribe: vi.fn((observer) => {
        observer.next({
          status: 'SUCCESS',
          imageUrl: 'https://example.com/invalid-image.png',
        })
        observer.complete()
      }),
    } as any)

    // Mock failed fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as Response)

    const result = await generateAndUploadImages({
      prompt: 'test prompt',
      storyId: 'test-story-id',
      sceneId: '1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to download generated image: Not Found')
    expect(mockSplitImageToQuadrantArray).not.toHaveBeenCalled()
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('should handle Midjourney task failure', async () => {
    mockImagine.mockReturnValue({
      subscribe: vi.fn((observer) => {
        observer.next({ code: 1, result: 'test-task-id' })
        observer.complete()
      }),
    } as any)

    mockWatch.mockReturnValue({
      subscribe: vi.fn((observer) => {
        observer.next({
          status: 'FAILURE',
          failReason: 'Content policy violation',
        })
        observer.complete()
      }),
    } as any)

    const result = await generateAndUploadImages({
      prompt: 'inappropriate content',
      storyId: 'test-story-id',
      sceneId: '1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Image generation failed: Content policy violation')
    expect(fetch).not.toHaveBeenCalled()
    expect(mockSplitImageToQuadrantArray).not.toHaveBeenCalled()
    expect(mockPut).not.toHaveBeenCalled()
  })
})
