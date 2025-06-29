import { s3 } from '@/integration/s3'
import { env } from '@/lib/env'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'

export type BlobResult = {
  url: string
  pathname: string
  contentType: string
  contentDisposition: string
  size: number
}

export type PutBlobOptions = {
  access?: 'public' | 'private'
  contentType?: string
  addRandomSuffix?: boolean
}

/**
 * Upload a file to Cloudflare R2 (compatible with Vercel Blob API)
 */
export async function put(
  pathname: string,
  body: ArrayBuffer | Uint8Array | Buffer | string,
  options: PutBlobOptions = {},
): Promise<BlobResult> {
  const {
    access = 'public',
    contentType = 'application/octet-stream',
    addRandomSuffix = true,
  } = options

  // Add random suffix to prevent conflicts
  const finalPathname = addRandomSuffix ? `${pathname}-${nanoid(8)}` : pathname

  // Clean pathname (remove leading slash if present)
  const key = finalPathname.startsWith('/')
    ? finalPathname.slice(1)
    : finalPathname

  try {
    // Convert body to Buffer if needed
    let bodyBuffer: Buffer
    if (typeof body === 'string') {
      bodyBuffer = Buffer.from(body, 'utf-8')
    } else if (body instanceof ArrayBuffer) {
      bodyBuffer = Buffer.from(body)
    } else if (body instanceof Uint8Array) {
      bodyBuffer = Buffer.from(body)
    } else {
      bodyBuffer = body as Buffer
    }

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType,
      // Make public if access is public
      ...(access === 'public' && {
        ACL: 'public-read',
      }),
    })

    await s3.send(command)

    // Generate public URL
    const url = `https://${env.CLOUDFLARE_R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`

    return {
      url,
      pathname: key,
      contentType,
      contentDisposition: `inline; filename="${key}"`,
      size: bodyBuffer.length,
    }
  } catch (error) {
    console.error('Failed to upload to R2:', error)
    throw new Error('Failed to upload file')
  }
}

/**
 * Get a file from Cloudflare R2 (compatible with Vercel Blob API)
 */
export async function get(pathname: string): Promise<ArrayBuffer | null> {
  const key = pathname.startsWith('/') ? pathname.slice(1) : pathname

  try {
    const command = new GetObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
    })

    const response = await s3.send(command)

    if (!response.Body) {
      return null
    }

    // Convert stream to ArrayBuffer
    const chunks: Uint8Array[] = []
    const reader = response.Body.transformToWebStream().getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    return result.buffer
  } catch (error) {
    console.error('Failed to get from R2:', error)
    return null
  }
}

/**
 * Delete a file from Cloudflare R2 (compatible with Vercel Blob API)
 */
export async function del(pathname: string): Promise<void> {
  const key = pathname.startsWith('/') ? pathname.slice(1) : pathname

  try {
    const command = new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
    })

    await s3.send(command)
  } catch (error) {
    console.error('Failed to delete from R2:', error)
    throw new Error('Failed to delete file')
  }
}

/**
 * List files in Cloudflare R2 (compatible with Vercel Blob API)
 */
export async function list(
  options: { prefix?: string; limit?: number } = {},
): Promise<{
  blobs: Array<{
    url: string
    pathname: string
    size: number
    uploadedAt: Date
  }>
}> {
  // This is a simplified implementation
  // You can extend it based on your needs
  return {
    blobs: [],
  }
}
