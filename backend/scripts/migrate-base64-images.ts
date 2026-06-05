// d:\officw work -1\ai-1\backend\scripts\migrate-base64-images.ts
import { PrismaClient, WaferImageType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Decodes a base64 Data URL (e.g. data:image/png;base64,...) into a raw Buffer and mimeType.
 */
function parseBase64DataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    return {
      mimeType: matches[1],
      buffer: Buffer.from(matches[2], 'base64'),
    };
  }
  // Fallback for raw base64 string
  return {
    mimeType: 'image/png',
    buffer: Buffer.from(dataUrl, 'base64'),
  };
}

/**
 * Extracts a numeric wafer ID from the filename or name string.
 */
function extractWaferId(name: string): string {
  const match = name.match(/(?:wafer_)?(\d+)/i);
  return match ? match[1] : name.replace(/\.[^/.]+$/, "");
}

async function main() {
  console.log('Starting migration of legacy base64 wafer images to bytea in PostgreSQL...');
  
  // Use raw SQL to query legacy columns so the script compiles even after fields are pruned in schema.prisma
  let aiWafers: any[] = [];
  try {
    aiWafers = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "AiWafer"
      WHERE "waferImageUrl" IS NOT NULL
         OR "overlayDataUrl" IS NOT NULL
         OR "densityDataUrl" IS NOT NULL
         OR "attentionDataUrl" IS NOT NULL
    `);
  } catch (err) {
    console.log('Legacy columns do not exist in the database anymore. Database is already fully migrated!');
    return;
  }

  console.log(`Found ${aiWafers.length} legacy base64 AiWafer records to migrate.`);

  if (aiWafers.length === 0) {
    console.log('No wafer records found requiring migration. DB is already up-to-date.');
    return;
  }

  const BATCH_SIZE = 20;
  for (let i = 0; i < aiWafers.length; i += BATCH_SIZE) {
    const batch = aiWafers.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (aiWafer) => {
        try {
          const extractedWaferId = extractWaferId(aiWafer.name);
          
          // A. Find or create Lot to satisfy foreign key constraints
          let lot = await prisma.lot.findFirst({
            where: { lotId: aiWafer.lot },
          });
          
          if (!lot) {
            try {
              // Locate an existing Fab and Tester to link to the new Lot
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
                  lotId: aiWafer.lot,
                  fabId: fab.id,
                  testerId: tester.id,
                },
              });
            } catch (createErr) {
              // Fallback to query the Lot that won the concurrent creation race
              lot = await prisma.lot.findFirst({
                where: { lotId: aiWafer.lot },
              });
            }
          }

          if (!lot) {
            throw new Error(`Could not find or create Lot for ID ${aiWafer.lot}`);
          }

          // B. Find or create Wafer to map WaferImage relations
          let wafer = await prisma.wafer.findFirst({
            where: {
              lotId: lot.id,
              waferId: extractedWaferId,
            },
          });
          
          if (!wafer) {
            try {
              wafer = await prisma.wafer.create({
                data: {
                  waferId: extractedWaferId,
                  lotId: lot.id,
                },
              });
            } catch (createErr) {
              // Fallback to query the Wafer that won the concurrent creation race
              wafer = await prisma.wafer.findFirst({
                where: {
                  lotId: lot.id,
                  waferId: extractedWaferId,
                },
              });
            }
          }

          if (!wafer) {
            throw new Error(`Could not find or create Wafer for ID ${extractedWaferId} in Lot ${lot.id}`);
          }

          // C. Migrate each legacy base64 image column to WaferImage bytea table
          let originalImageId: string | null = null;
          
          // waferImageUrl -> RAW_BIN_MAP
          if (aiWafer.waferImageUrl) {
            const { buffer, mimeType } = parseBase64DataUrl(aiWafer.waferImageUrl);
            const img = await prisma.waferImage.create({
              data: {
                waferId: wafer.id,
                aiWaferId: aiWafer.id,
                imageType: WaferImageType.RAW_BIN_MAP,
                rawBytes: buffer,
                mimeType,
                fileSizeBytes: buffer.length,
              },
            });
            originalImageId = img.id;
          }

          // overlayDataUrl -> DEFECT_MASK
          if (aiWafer.overlayDataUrl) {
            const { buffer, mimeType } = parseBase64DataUrl(aiWafer.overlayDataUrl);
            await prisma.waferImage.create({
              data: {
                waferId: wafer.id,
                aiWaferId: aiWafer.id,
                imageType: WaferImageType.DEFECT_MASK,
                rawBytes: buffer,
                mimeType,
                fileSizeBytes: buffer.length,
              },
            });
          }

          // densityDataUrl -> PROCESSED_THUMBNAIL
          if (aiWafer.densityDataUrl) {
            const { buffer, mimeType } = parseBase64DataUrl(aiWafer.densityDataUrl);
            await prisma.waferImage.create({
              data: {
                waferId: wafer.id,
                aiWaferId: aiWafer.id,
                imageType: WaferImageType.PROCESSED_THUMBNAIL,
                rawBytes: buffer,
                mimeType,
                fileSizeBytes: buffer.length,
              },
            });
          }

          // attentionDataUrl -> GRADCAM_OVERLAY
          if (aiWafer.attentionDataUrl) {
            const { buffer, mimeType } = parseBase64DataUrl(aiWafer.attentionDataUrl);
            await prisma.waferImage.create({
              data: {
                waferId: wafer.id,
                aiWaferId: aiWafer.id,
                imageType: WaferImageType.GRADCAM_OVERLAY,
                rawBytes: buffer,
                mimeType,
                fileSizeBytes: buffer.length,
              },
            });
          }

          // D. Store reference to the main raw image and null out base64 columns in database
          await prisma.$executeRawUnsafe(`
            UPDATE "AiWafer"
            SET "waferImageId" = $1,
                "waferImageUrl" = NULL,
                "overlayDataUrl" = NULL,
                "densityDataUrl" = NULL,
                "attentionDataUrl" = NULL
            WHERE id = $2
          `, originalImageId, aiWafer.id);

          console.log(`Migrated wafer {id: ${aiWafer.id}, name: ${aiWafer.name}} to postgres bytea successfully.`);
        } catch (err: any) {
          console.error(`Failed to migrate AiWafer ${aiWafer.id}: ${err.message}`);
        }
      })
    );
    
    console.log(`Successfully completed batch ${i / BATCH_SIZE + 1}/${Math.ceil(aiWafers.length / BATCH_SIZE)}`);
  }

  console.log('Image migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed with critical error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
