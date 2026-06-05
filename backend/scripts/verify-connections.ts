import { PrismaClient } from '@prisma/client'
import { Client as MinioClient } from 'minio'

async function verifyPostgres() {
  const prisma = new PrismaClient()
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    const waferCount = await prisma.wafer.count()
    console.log(`✓ PostgreSQL connected — ${waferCount} wafers in DB`)
  } catch (e: any) { console.error('✗ PostgreSQL FAILED:', e.message || e.code || e) }
  finally { await prisma.$disconnect() }
}

async function verifyMinio() {
  const client = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || '',
    secretKey: process.env.MINIO_ROOT_PASSWORD || '',
  })
  try {
    const bucket = process.env.MINIO_BUCKET_WAFER || 'wafer-images'
    const exists = await client.bucketExists(bucket)
    if (!exists) {
      console.log(`✓ MinIO connected — bucket [${bucket}] does not exist yet (will be auto-provisioned by NestJS backend on start)`)
    } else {
      const objects: string[] = []
      const stream = client.listObjects(bucket, '', false)
      stream.on('data', obj => objects.push(obj.name || ''))
      await new Promise(res => stream.on('end', res))
      console.log(`✓ MinIO connected — bucket [${bucket}] has ${objects.length} objects`)
    }
  } catch (e: any) { console.error('✗ MinIO FAILED:', e.message || e.code || e) }
}

async function verifyWaferImageRouting() {
  const prisma = new PrismaClient()
  try {
    const pgImages = await prisma.waferImage.count({ where: { storageBackend: 'POSTGRES' } })
    const minioImages = await prisma.waferImage.count({ where: { storageBackend: 'MINIO' } })
    console.log(`✓ WaferImage routing — ${pgImages} in Postgres, ${minioImages} in MinIO`)
  } catch (e: any) { console.error('✗ WaferImage check FAILED:', e.message || e.code || e) }
  finally { await prisma.$disconnect() }
}

Promise.all([verifyPostgres(), verifyMinio(), verifyWaferImageRouting()])
  .then(() => console.log('\nAll connection checks complete.'))
