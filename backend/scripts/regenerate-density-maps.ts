// d:\officw work -1\ai-1\backend\scripts\regenerate-density-maps.ts
import { PrismaClient, WaferImageType, StorageBackend } from '@prisma/client';
import axios from 'axios';
import FormData from 'form-data';

const prisma = new PrismaClient();
const FASTAPI_URL = 'http://localhost:8000';

async function main() {
  console.log('Starting regeneration of density maps and die-level records...');

  const aiWafers = await prisma.aiWafer.findMany();
  console.log(`Found ${aiWafers.length} AiWafer records in database.`);

  for (const wafer of aiWafers) {
    console.log(`Processing wafer: ${wafer.name} (Lot: ${wafer.lot})`);

    // Find the RAW_BIN_MAP image in the database
    const rawImage = await prisma.waferImage.findFirst({
      where: {
        aiWaferId: wafer.id,
        imageType: WaferImageType.RAW_BIN_MAP,
      },
    });

    if (!rawImage || !rawImage.rawBytes) {
      console.warn(`- Skip: No raw binary map image found in DB for wafer ID: ${wafer.id}`);
      continue;
    }

    // A. Find or create Lot to satisfy foreign key constraints
    let lot = await prisma.lot.findFirst({
      where: { lotId: wafer.lot },
    });
    if (!lot) {
      console.log(`- Creating missing Lot record for ID: ${wafer.lot}`);
      let fab = await prisma.fab.findFirst();
      if (!fab) {
        fab = await prisma.fab.create({ data: { name: 'Fab 1', location: 'Oregon' } });
      }
      let tester = await prisma.tester.findFirst();
      if (!tester) {
        tester = await prisma.tester.create({
          data: { name: 'Tester A', equipmentRate: 0.15, fabId: fab.id },
        });
      }
      lot = await prisma.lot.create({
        data: {
          lotId: wafer.lot,
          fabId: fab.id,
          testerId: tester.id,
        },
      });
    }

    // B. Find or create Wafer to map relations
    const match = wafer.name.match(/(?:wafer_)?(\d+)/i);
    const extractedWaferId = match ? match[1] : wafer.name.replace(/\.[^/.]+$/, "");

    let dbWafer = await prisma.wafer.findFirst({
      where: {
        lotId: lot.id,
        waferId: extractedWaferId,
      },
    });
    if (!dbWafer) {
      dbWafer = await prisma.wafer.create({
        data: {
          waferId: extractedWaferId,
          lotId: lot.id,
        },
      });
    }

    try {
      // Post the raw image bytes to the FastAPI /predict endpoint to get the fresh heatmaps/dies
      const form = new FormData();
      form.append('file', rawImage.rawBytes, {
        filename: wafer.name,
        contentType: 'image/png',
      });

      const response = await axios.post(`${FASTAPI_URL}/predict`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      const result = response.data;

      // 1. Save PROCESSED_THUMBNAIL (Density Map)
      if (result.densityDataUrl) {
        const b64 = result.densityDataUrl.split(',')[1];
        if (b64) {
          const buffer = Buffer.from(b64, 'base64');
          await prisma.waferImage.upsert({
            where: {
              waferId_imageType: {
                waferId: dbWafer.id,
                imageType: WaferImageType.PROCESSED_THUMBNAIL,
              },
            },
            update: {
              aiWaferId: wafer.id,
              storageBackend: StorageBackend.POSTGRES,
              rawBytes: buffer,
              fileSizeBytes: buffer.length,
            },
            create: {
              waferId: dbWafer.id,
              aiWaferId: wafer.id,
              imageType: WaferImageType.PROCESSED_THUMBNAIL,
              storageBackend: StorageBackend.POSTGRES,
              rawBytes: buffer,
              fileSizeBytes: buffer.length,
            },
          });
          console.log(`- ✓ Saved PROCESSED_THUMBNAIL (Density Map)`);
        }
      }

      // 2. Save dies to Die table
      if (result.dies && Array.isArray(result.dies)) {
        await prisma.die.deleteMany({
          where: { waferId: dbWafer.id },
        });

        const diesToCreate = result.dies.map((d: any) => ({
          waferId: dbWafer.id,
          x: d.die_col,
          y: d.die_row,
          bin: d.label === 'GOOD' ? 1 : 2,
          failType: d.label === 'FAIL' ? wafer.class : null,
        }));

        await prisma.die.createMany({
          data: diesToCreate,
        });
        console.log(`- ✓ Saved ${diesToCreate.length} Die records`);
      }

    } catch (err: any) {
      console.error(`- ✗ Failed to process wafer ${wafer.name}:`, err.message);
    }
  }

  console.log('Regeneration process completed!');
}

main()
  .catch((e) => {
    console.error('Script failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
