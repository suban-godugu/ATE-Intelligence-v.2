-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('ACTIVE', 'IN_TEST', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PatternType" AS ENUM ('SCAN', 'BIST', 'ATPG', 'FUNC', 'IDDQ', 'MBST', 'BSCA');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "FaultClass" AS ENUM ('STUCK_AT', 'TRANSITION', 'CELL_AWARE', 'IDDQ', 'BRIDGE', 'PATH_DELAY');

-- CreateEnum
CREATE TYPE "PatternDomain" AS ENUM ('SCAN_CHAIN', 'ATPG_TRANSITION', 'ATPG_STUCK_AT', 'MBIST', 'LBIST', 'BIST', 'IDDQ', 'BSCA');

-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('FAULT_COVERAGE', 'TOGGLE_COVERAGE', 'STRUCTURAL', 'FUNCTIONAL', 'TRANSITION');

-- CreateEnum
CREATE TYPE "RedundancyType" AS ENUM ('COLUMN', 'ROW', 'WORD', 'BIT', 'LOCAL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "PatternAnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "Fab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "equipmentRate" DOUBLE PRECISION NOT NULL,
    "fabId" TEXT NOT NULL,

    CONSTRAINT "Tester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "fabId" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'IN_TEST',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wafer" (
    "id" TEXT NOT NULL,
    "waferId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,

    CONSTRAINT "Wafer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Die" (
    "id" TEXT NOT NULL,
    "waferId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "bin" INTEGER NOT NULL DEFAULT 1,
    "failType" TEXT,

    CONSTRAINT "Die_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "patternType" "PatternType" NOT NULL,
    "killRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "dieId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "testTimeMs" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" UUID NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "fabId" TEXT,
    "lotId" TEXT,
    "totalTestCost" DECIMAL(12,2) NOT NULL,
    "costPerWafer" DECIMAL(10,4) NOT NULL,
    "costPerDie" DECIMAL(10,6) NOT NULL,
    "testTimeAvgMs" DECIMAL(10,2) NOT NULL,
    "yieldOverall" DECIMAL(5,2) NOT NULL,
    "roiImprovement" DECIMAL(12,2) NOT NULL,
    "totalDies" INTEGER NOT NULL,
    "passingDies" INTEGER NOT NULL,
    "failedDies" INTEGER NOT NULL,
    "patternCount" INTEGER NOT NULL,
    "redundantPatternCount" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "fabId" TEXT NOT NULL,
    "constraints" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternAnalysis" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "domain" "PatternDomain" NOT NULL,
    "faultClass" "FaultClass" NOT NULL,
    "totalPatterns" INTEGER NOT NULL,
    "faultsCovered" INTEGER NOT NULL,
    "faultsDetected" INTEGER NOT NULL,
    "faultsUntested" INTEGER NOT NULL,
    "coveragePct" DOUBLE PRECISION NOT NULL,
    "executionTimeMs" DOUBLE PRECISION NOT NULL,
    "passCount" INTEGER NOT NULL,
    "failCount" INTEGER NOT NULL,
    "status" "PatternAnalysisStatus" NOT NULL DEFAULT 'COMPLETE',
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatternAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailSite" (
    "id" TEXT NOT NULL,
    "patternAnalysisId" TEXT NOT NULL,
    "dieX" INTEGER NOT NULL,
    "dieY" INTEGER NOT NULL,
    "waferId" TEXT NOT NULL,
    "faultClass" "FaultClass" NOT NULL,
    "cycleCount" INTEGER NOT NULL,
    "failAddress" TEXT,
    "bitPosition" INTEGER,
    "wordAddress" INTEGER,
    "severity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FailSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanChainResult" (
    "id" TEXT NOT NULL,
    "patternAnalysisId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "chainLength" INTEGER NOT NULL,
    "shiftCycles" INTEGER NOT NULL,
    "captureWindows" INTEGER NOT NULL,
    "passRate" DOUBLE PRECISION NOT NULL,
    "cellsFailed" INTEGER NOT NULL,
    "cellsPassed" INTEGER NOT NULL,
    "stitchedBridges" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScanChainResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageMetric" (
    "id" TEXT NOT NULL,
    "patternAnalysisId" TEXT NOT NULL,
    "coverageType" "CoverageType" NOT NULL,
    "achieved" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "gap" DOUBLE PRECISION NOT NULL,
    "faultCount" INTEGER NOT NULL,
    "coveredFaults" INTEGER NOT NULL,

    CONSTRAINT "CoverageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MbistResult" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "memoryCellId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "wordLines" INTEGER NOT NULL,
    "bitLines" INTEGER NOT NULL,
    "retentionTimeMs" DOUBLE PRECISION NOT NULL,
    "passCount" INTEGER NOT NULL,
    "failCount" INTEGER NOT NULL,
    "failAddresses" JSONB NOT NULL DEFAULT '[]',
    "coveragePct" DOUBLE PRECISION NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MbistResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LbistResult" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "logicBlockId" TEXT NOT NULL,
    "seedValue" TEXT NOT NULL,
    "clockCycles" INTEGER NOT NULL,
    "signaturePassed" BOOLEAN NOT NULL,
    "expectedSignature" TEXT NOT NULL,
    "actualSignature" TEXT NOT NULL,
    "coveragePct" DOUBLE PRECISION NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LbistResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BistResult" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "bistType" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "testMode" TEXT NOT NULL,
    "passCount" INTEGER NOT NULL,
    "failCount" INTEGER NOT NULL,
    "coveragePct" DOUBLE PRECISION NOT NULL,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BistResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedundancyMap" (
    "id" TEXT NOT NULL,
    "waferId" TEXT NOT NULL,
    "dieX" INTEGER NOT NULL,
    "dieY" INTEGER NOT NULL,
    "redundancyType" "RedundancyType" NOT NULL,
    "address" INTEGER NOT NULL,
    "repaired" BOOLEAN NOT NULL DEFAULT false,
    "repairAddress" INTEGER,
    "faultCount" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedundancyMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotId_key" ON "Lot"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Wafer_lotId_waferId_key" ON "Wafer"("lotId", "waferId");

-- CreateIndex
CREATE UNIQUE INDEX "Pattern_patternId_key" ON "Pattern"("patternId");

-- CreateIndex
CREATE INDEX "DashboardSnapshot_snapshotAt_fabId_lotId_idx" ON "DashboardSnapshot"("snapshotAt" DESC, "fabId", "lotId");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationJob_jobId_key" ON "OptimizationJob"("jobId");

-- CreateIndex
CREATE INDEX "PatternAnalysis_lotId_domain_idx" ON "PatternAnalysis"("lotId", "domain");

-- CreateIndex
CREATE INDEX "PatternAnalysis_analyzedAt_idx" ON "PatternAnalysis"("analyzedAt" DESC);

-- CreateIndex
CREATE INDEX "FailSite_patternAnalysisId_faultClass_idx" ON "FailSite"("patternAnalysisId", "faultClass");

-- CreateIndex
CREATE INDEX "ScanChainResult_patternAnalysisId_idx" ON "ScanChainResult"("patternAnalysisId");

-- CreateIndex
CREATE INDEX "CoverageMetric_patternAnalysisId_coverageType_idx" ON "CoverageMetric"("patternAnalysisId", "coverageType");

-- CreateIndex
CREATE INDEX "MbistResult_lotId_idx" ON "MbistResult"("lotId");

-- CreateIndex
CREATE INDEX "MbistResult_testedAt_idx" ON "MbistResult"("testedAt" DESC);

-- CreateIndex
CREATE INDEX "LbistResult_lotId_idx" ON "LbistResult"("lotId");

-- CreateIndex
CREATE INDEX "BistResult_lotId_bistType_idx" ON "BistResult"("lotId", "bistType");

-- CreateIndex
CREATE INDEX "RedundancyMap_waferId_repaired_idx" ON "RedundancyMap"("waferId", "repaired");

-- CreateIndex
CREATE UNIQUE INDEX "RedundancyMap_waferId_dieX_dieY_redundancyType_address_key" ON "RedundancyMap"("waferId", "dieX", "dieY", "redundancyType", "address");

-- AddForeignKey
ALTER TABLE "Tester" ADD CONSTRAINT "Tester_fabId_fkey" FOREIGN KEY ("fabId") REFERENCES "Fab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_fabId_fkey" FOREIGN KEY ("fabId") REFERENCES "Fab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "Tester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wafer" ADD CONSTRAINT "Wafer_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Die" ADD CONSTRAINT "Die_waferId_fkey" FOREIGN KEY ("waferId") REFERENCES "Wafer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_dieId_fkey" FOREIGN KEY ("dieId") REFERENCES "Die"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternAnalysis" ADD CONSTRAINT "PatternAnalysis_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternAnalysis" ADD CONSTRAINT "PatternAnalysis_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailSite" ADD CONSTRAINT "FailSite_patternAnalysisId_fkey" FOREIGN KEY ("patternAnalysisId") REFERENCES "PatternAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanChainResult" ADD CONSTRAINT "ScanChainResult_patternAnalysisId_fkey" FOREIGN KEY ("patternAnalysisId") REFERENCES "PatternAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageMetric" ADD CONSTRAINT "CoverageMetric_patternAnalysisId_fkey" FOREIGN KEY ("patternAnalysisId") REFERENCES "PatternAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MbistResult" ADD CONSTRAINT "MbistResult_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LbistResult" ADD CONSTRAINT "LbistResult_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BistResult" ADD CONSTRAINT "BistResult_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedundancyMap" ADD CONSTRAINT "RedundancyMap_waferId_fkey" FOREIGN KEY ("waferId") REFERENCES "Wafer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AiWafer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lot" TEXT NOT NULL,
    "good" INTEGER NOT NULL,
    "fail" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "yield" DOUBLE PRECISION NOT NULL,
    "probabilities" JSONB NOT NULL,
    "waferImageUrl" TEXT,
    "overlayDataUrl" TEXT,
    "densityDataUrl" TEXT,
    "attentionDataUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiWafer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiWafer_lot_name_key" ON "AiWafer"("lot", "name");

-- CreateTable
CREATE TABLE "ate_dft_files" (
    "id" SERIAL NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "detectedType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "parserUsed" TEXT,
    "uploadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ate_dft_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ate_dft_files_fileId_key" ON "ate_dft_files"("fileId");

-- CreateTable
CREATE TABLE "ate_dft_predictions" (
    "id" SERIAL NOT NULL,
    "fileId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendation" TEXT,
    "featuresJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ate_dft_predictions_pkey" PRIMARY KEY ("id")
);
