-- CreateIndex B-Tree indices to optimize full-table scans
CREATE INDEX IF NOT EXISTS "Die_waferId_idx" ON "Die"("waferId");

CREATE INDEX IF NOT EXISTS "TestResult_dieId_idx" ON "TestResult"("dieId");
CREATE INDEX IF NOT EXISTS "TestResult_patternId_idx" ON "TestResult"("patternId");
CREATE INDEX IF NOT EXISTS "TestResult_patternId_dieId_idx" ON "TestResult"("patternId", "dieId");

CREATE INDEX IF NOT EXISTS "Wafer_lotId_idx" ON "Wafer"("lotId");

CREATE INDEX IF NOT EXISTS "Lot_fabId_idx" ON "Lot"("fabId");
CREATE INDEX IF NOT EXISTS "Lot_status_idx" ON "Lot"("status");
