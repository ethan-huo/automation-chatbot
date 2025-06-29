import { env } from '@/lib/env'
import { S3Client } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  region: 'auto',

  // Cloudflare R2: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
  // `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_SECRET_KEY,
  },
})

export function createCloudflareR2Url(opts: { bucket: string; key: string }) {
  return `https://${opts.bucket}.r2.cloudflarestorage.com/${opts.key}`
}

export function createCloudflareR2PublicDevUrl(opts: { key: string }) {
  return `${env.CLOUDFLARE_R2_PUBLIC_DEV_URL}/${opts.key}`
}
