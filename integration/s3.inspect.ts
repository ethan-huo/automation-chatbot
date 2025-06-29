import { readFileSync } from 'fs'
import { join } from 'path'
import { env } from '@/lib/env'
import {
  DeleteObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

import { s3 } from './s3'

async function testS3Integration(): Promise<void> {
  try {
    // 1. 列出 buckets
    console.log('🔍 Listing buckets...')
    const bucketsResult = await s3.send(new ListBucketsCommand({}))
    console.log('✅ Buckets:', bucketsResult.Buckets?.map((b) => b.Name) || [])

    // 2. 读取并上传 s3.ts 文件
    console.log('\n📤 Uploading s3.ts file...')
    const filePath = join(__dirname, 's3.ts')
    const fileContent = readFileSync(filePath, 'utf-8')
    const key = 'test-uploads/s3.ts'

    const uploadResult = await s3.send(
      new PutObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: 'text/plain',
      }),
    )

    console.log('✅ Upload successful!')
    console.log('📊 Upload result:', {
      ETag: uploadResult.ETag,
      VersionId: uploadResult.VersionId,
      Key: key,
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    })

    // 3. 删除文件
    console.log('\n🗑️  Deleting uploaded file...')
    const deleteResult = await s3.send(
      new DeleteObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
      }),
    )

    console.log('✅ Delete successful!')
    console.log('📊 Delete result:', {
      DeleteMarker: deleteResult.DeleteMarker,
      VersionId: deleteResult.VersionId,
    })

    console.log('\n🎉 S3 integration test completed successfully!')
  } catch (error) {
    console.error('❌ S3 integration test failed:', error)
    throw error
  }
}

testS3Integration()
