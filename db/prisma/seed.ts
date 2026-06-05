import { PrismaClient, LotStatus, PatternType } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting high-performance database seed...');
  const start = Date.now();

  // 1. Clear database
  console.log('Clearing existing data...');
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.optimizationJob.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.die.deleteMany();
  await prisma.wafer.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.tester.deleteMany();
  await prisma.fab.deleteMany();
  await prisma.pattern.deleteMany();

  // 2. Generate 20 Patterns
  console.log('Generating 20 patterns...');
  const patternTypes = Object.values(PatternType);
  const patterns = Array.from({ length: 20 }).map((_, i) => {
    const id = randomUUID();
    const type = patternTypes[i % patternTypes.length];
    return {
      id,
      patternId: `PAT-${type}-${String(i + 1).padStart(3, '0')}`,
      patternType: type,
      killRatio: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
    };
  });
  await prisma.pattern.createMany({ data: patterns });

  // 3. Generate 3 Fabs
  console.log('Generating 3 fabs...');
  const fabLocations = ['Hsinchu, Taiwan', 'Austin, TX, USA', 'Dresden, Germany'];
  const fabs = Array.from({ length: 3 }).map((_, i) => ({
    id: randomUUID(),
    name: `FAB-${i + 1}`,
    location: fabLocations[i],
  }));
  await prisma.fab.createMany({ data: fabs });

  // 4. Generate 5 Testers
  console.log('Generating 5 testers...');
  const testers = Array.from({ length: 5 }).map((_, i) => {
    const fab = fabs[i % fabs.length];
    return {
      id: randomUUID(),
      name: `TESTER-${i + 1}`,
      equipmentRate: parseFloat((0.05 + Math.random() * 0.15).toFixed(4)), // 0.05 to 0.20 USD/sec
      fabId: fab.id,
    };
  });
  await prisma.tester.createMany({ data: testers });

  // 5. Generate 10 Lots
  console.log('Generating 10 lots...');
  const lotStatuses = [LotStatus.ACTIVE, LotStatus.IN_TEST, LotStatus.COMPLETED];
  const lots = Array.from({ length: 10 }).map((_, i) => {
    const tester = testers[i % testers.length];
    const status = lotStatuses[i % lotStatuses.length];
    return {
      id: randomUUID(),
      lotId: `LOT-2026-${String(i + 1).padStart(3, '0')}`,
      fabId: tester.fabId,
      testerId: tester.id,
      status,
      startedAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
      completedAt: status === LotStatus.COMPLETED ? new Date() : null,
    };
  });
  await prisma.lot.createMany({ data: lots });

  // 6. Generate 5 Wafers per Lot (50 Wafers total)
  console.log('Generating 50 wafers...');
  const wafers: any[] = [];
  lots.forEach((lot) => {
    for (let w = 1; w <= 5; w++) {
      wafers.push({
        id: randomUUID(),
        waferId: String(w).padStart(2, '0'),
        lotId: lot.id,
      });
    }
  });
  await prisma.wafer.createMany({ data: wafers });

  // 7. Generate 489 Dies per Wafer (24,450 Dies total)
  console.log('Generating 24,450 dies...');
  const dies: any[] = [];
  const failTypes = ['parametric', 'leakage', 'functional', 'bridge', 'open', 'gate-oxide'];

  wafers.forEach((wafer) => {
    let dieCount = 0;
    for (let x = 0; x < 21 && dieCount < 489; x++) {
      for (let y = 0; y < 23 && dieCount < 489; y++) {
        const isPass = Math.random() > 0.08; // 92% yield
        const bin = isPass ? 1 : Math.floor(Math.random() * 8) + 2;
        const failType = isPass ? null : failTypes[Math.floor(Math.random() * failTypes.length)];

        dies.push({
          id: randomUUID(),
          waferId: wafer.id,
          x,
          y,
          bin,
          failType,
        });
        dieCount++;
      }
    }
    while (dieCount < 489) {
      const isPass = Math.random() > 0.08;
      const bin = isPass ? 1 : Math.floor(Math.random() * 8) + 2;
      const failType = isPass ? null : failTypes[Math.floor(Math.random() * failTypes.length)];
      dies.push({
        id: randomUUID(),
        waferId: wafer.id,
        x: 21,
        y: dieCount - 483,
        bin,
        failType,
      });
      dieCount++;
    }
  });

  console.log('Inserting dies into database (batch size 5,000)...');
  const dieChunkSize = 5000;
  for (let i = 0; i < dies.length; i += dieChunkSize) {
    const chunk = dies.slice(i, i + dieChunkSize);
    await prisma.die.createMany({ data: chunk });
    console.log(`  Inserted dies: ${Math.min(i + dieChunkSize, dies.length)} / ${dies.length}`);
  }

  // 8. Generate Test Results for all dies (3 patterns per die)
  console.log('Generating test results (3 patterns per die)...');
  const testResults: any[] = [];
  
  const waferToTesterMap = new Map<string, { equipmentRate: number }>();
  wafers.forEach(w => {
    const lot = lots.find(l => l.id === w.lotId)!;
    const tester = testers.find(t => t.id === lot.testerId)!;
    waferToTesterMap.set(w.id, { equipmentRate: tester.equipmentRate });
  });

  dies.forEach((die) => {
    const waferDetails = waferToTesterMap.get(die.waferId)!;
    
    // Choose 3 random patterns
    const shuffledPatterns = [...patterns].sort(() => 0.5 - Math.random()).slice(0, 3);

    shuffledPatterns.forEach((pattern) => {
      const testTimeMs = parseFloat((10 + Math.random() * 140).toFixed(2));
      const costUsd = parseFloat((waferDetails.equipmentRate * (testTimeMs / 1000)).toFixed(6));
      
      const passed = die.bin === 1 ? true : Math.random() > 0.5;

      testResults.push({
        id: randomUUID(),
        dieId: die.id,
        patternId: pattern.id,
        testTimeMs,
        passed,
        costUsd,
        testedAt: new Date(),
      });
    });
  });

  console.log('Inserting test results into database (batch size 10,000)...');
  const testChunkSize = 10000;
  for (let i = 0; i < testResults.length; i += testChunkSize) {
    const chunk = testResults.slice(i, i + testChunkSize);
    await prisma.testResult.createMany({ data: chunk });
    console.log(`  Inserted test results: ${Math.min(i + testChunkSize, testResults.length)} / ${testResults.length}`);
  }

  // 9. Generate Mock snapshots
  console.log('Generating mock dashboard snapshot...');
  await prisma.dashboardSnapshot.create({
    data: {
      id: randomUUID(),
      snapshotAt: new Date(),
      totalTestCost: 28540.35,
      costPerWafer: 570.807,
      costPerDie: 1.16729,
      testTimeAvgMs: 82.45,
      yieldOverall: 92.14,
      roiImprovement: 4850.00,
      totalDies: 24450,
      passingDies: 22528,
      failedDies: 1922,
      patternCount: 20,
      redundantPatternCount: 4,
    }
  });

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`Seeding completed successfully in ${duration}s!`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
