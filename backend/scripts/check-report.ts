import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

async function main() {
  console.log('Fetching all validation reports from PostgreSQL and Redis...');

  // 1. Redis check
  const redis = new Redis({ host: 'localhost', port: 6379 });
  try {
    const keys = await redis.keys('fallback:validationReport:*');
    console.log(`Redis Fallback Keys Found: ${keys.length}`, keys);
    for (const key of keys) {
      const raw = await redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log(`- Redis Key: ${key}, Filename: ${parsed.filename}, Status: ${parsed.status}`);
        if (parsed.reportJson) {
          console.log('Report JSON:', JSON.stringify(JSON.parse(parsed.reportJson), null, 2));
        } else {
          console.log('No reportJson found in Redis fallback record directly. Base Record:', JSON.stringify(parsed, null, 2));
        }
      }
    }
  } catch (err: any) {
    console.error('Redis error:', err.message);
  } finally {
    redis.disconnect();
  }

  // 2. PostgreSQL check
  const prisma = new PrismaClient();
  try {
    const records = await prisma.validationReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(`PostgreSQL Records Found: ${records.length}`);
    for (const r of records) {
      console.log(`- DB ID: ${r.id}, ValId: ${r.validationId}, Filename: ${r.filename}, Status: ${r.status}`);
      console.log('Report JSON:', JSON.stringify(JSON.parse(r.reportJson as string), null, 2));
    }
  } catch (err: any) {
    console.error('PostgreSQL error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
