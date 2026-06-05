import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class PatternAnalysisRedesignService implements OnModuleInit {
  private readonly logger = new Logger(PatternAnalysisRedesignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting provisioning and seeding for Pattern Analysis Redesign tables...');
    try {
      // 1. Create scan_patterns table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS scan_patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id VARCHAR(50) NOT NULL UNIQUE,
          lot_id VARCHAR(50),
          fab_id VARCHAR(50),
          captured_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // 2. Create scan_chains table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS scan_chains (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id VARCHAR(50) NOT NULL,
          chain_id VARCHAR(50) NOT NULL UNIQUE,
          flip_flop_failures INTEGER DEFAULT 0,
          fault_class_type VARCHAR(50),
          chain_length INTEGER,
          ip_domain VARCHAR(50),
          risk VARCHAR(20),
          shift_cycles INTEGER,
          capture_windows INTEGER,
          pass_rate NUMERIC(5,2),
          cells_failed INTEGER,
          cells_passed INTEGER,
          lot_id VARCHAR(50),
          fab_id VARCHAR(50),
          captured_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS scan_chains_pattern_id_idx ON scan_chains (pattern_id);
      `);

      // 3. Create flip_flop_failures table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS flip_flop_failures (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chain_id VARCHAR(50) NOT NULL,
          flip_flop_id VARCHAR(50) NOT NULL,
          failure_count INTEGER DEFAULT 0,
          fault_type VARCHAR(50),
          capture_cycle INTEGER,
          severity VARCHAR(20),
          lot_id VARCHAR(50),
          fab_id VARCHAR(50),
          captured_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS flip_flop_failures_chain_id_idx ON flip_flop_failures (chain_id);
      `);

      this.logger.log('Redesign tables provisioned successfully. Checking seed data...');

      // 4. Seed scan_patterns if empty or has less than 20 records (allows testing multi-page pagination!)
      const patternsCount: any[] = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::integer as count FROM scan_patterns`);
      if (patternsCount[0]?.count < 20) {
        this.logger.log('Database has less than 20 patterns. Clearing and re-seeding full 20-pattern dataset...');
        await this.prisma.$executeRawUnsafe(`DELETE FROM flip_flop_failures`);
        await this.prisma.$executeRawUnsafe(`DELETE FROM scan_chains`);
        await this.prisma.$executeRawUnsafe(`DELETE FROM scan_patterns`);

        const patterns = [
          { patternId: 'PAT_001', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_002', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_003', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_004', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_005', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_006', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_007', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_008', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_009', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_010', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_011', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_012', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_013', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_014', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_015', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_016', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_017', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_018', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_019', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_020', lotId: 'LOT-2024-042', fabId: 'fab-001' },
        ];
        for (const p of patterns) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO scan_patterns (pattern_id, lot_id, fab_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            p.patternId, p.lotId, p.fabId
          );
        }

        // 5. Seed scan_chains
        this.logger.log('Seeding scan_chains (24 failed chains)...');
        const chains = [
          // PAT_001 chains
          { patternId: 'PAT_001', chainId: 'CHAIN_001', flipFlopFailures: 30, faultClassType: 'Bridging Fault', chainLength: 512, ipDomain: 'CPU', risk: 'Critical', shiftCycles: 256, captureWindows: 4, passRate: 94.1, cellsFailed: 30, cellsPassed: 482, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_001', chainId: 'CHAIN_002', flipFlopFailures: 8, faultClassType: 'Stuck-at-1', chainLength: 576, ipDomain: 'MEMORY', risk: 'High', shiftCycles: 288, captureWindows: 5, passRate: 98.6, cellsFailed: 8, cellsPassed: 568, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_001', chainId: 'CHAIN_003', flipFlopFailures: 9, faultClassType: 'Transition Fault', chainLength: 640, ipDomain: 'IO', risk: 'High', shiftCycles: 320, captureWindows: 6, passRate: 98.5, cellsFailed: 9, cellsPassed: 631, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_001', chainId: 'CHAIN_004', flipFlopFailures: 2, faultClassType: 'Stuck-at-0', chainLength: 704, ipDomain: 'LOGIC', risk: 'Medium', shiftCycles: 352, captureWindows: 7, passRate: 99.7, cellsFailed: 2, cellsPassed: 702, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { patternId: 'PAT_001', chainId: 'CHAIN_005', flipFlopFailures: 1, faultClassType: 'Open Fault', chainLength: 768, ipDomain: 'CPU', risk: 'Low', shiftCycles: 384, captureWindows: 8, passRate: 99.8, cellsFailed: 1, cellsPassed: 767, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_002 chains
          { patternId: 'PAT_002', chainId: 'CHAIN_006', flipFlopFailures: 5, faultClassType: 'Stuck-at-0', chainLength: 512, ipDomain: 'MEMORY', risk: 'High', shiftCycles: 256, captureWindows: 4, passRate: 99.0, cellsFailed: 5, cellsPassed: 507, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_003 chains
          { patternId: 'PAT_003', chainId: 'CHAIN_013', flipFlopFailures: 0, faultClassType: 'Stuck-at-1', chainLength: 512, ipDomain: 'CPU', risk: 'Low', shiftCycles: 256, captureWindows: 4, passRate: 100.0, cellsFailed: 0, cellsPassed: 512, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_004 chains
          { patternId: 'PAT_004', chainId: 'CHAIN_007', flipFlopFailures: 8, faultClassType: 'Transition Fault', chainLength: 640, ipDomain: 'LOGIC', risk: 'High', shiftCycles: 320, captureWindows: 6, passRate: 98.7, cellsFailed: 8, cellsPassed: 632, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_005 chains
          { patternId: 'PAT_005', chainId: 'CHAIN_008', flipFlopFailures: 2, faultClassType: 'Bridging Fault', chainLength: 704, ipDomain: 'CPU', risk: 'Medium', shiftCycles: 352, captureWindows: 7, passRate: 99.7, cellsFailed: 2, cellsPassed: 702, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_006 chains
          { patternId: 'PAT_006', chainId: 'CHAIN_009', flipFlopFailures: 14, faultClassType: 'Stuck-at-1', chainLength: 576, ipDomain: 'IO', risk: 'High', shiftCycles: 288, captureWindows: 5, passRate: 97.5, cellsFailed: 14, cellsPassed: 562, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_007 chains
          { patternId: 'PAT_007', chainId: 'CHAIN_014', flipFlopFailures: 0, faultClassType: 'Open Fault', chainLength: 640, ipDomain: 'LOGIC', risk: 'Low', shiftCycles: 320, captureWindows: 6, passRate: 100.0, cellsFailed: 0, cellsPassed: 640, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_008 chains
          { patternId: 'PAT_008', chainId: 'CHAIN_010', flipFlopFailures: 6, faultClassType: 'Open Fault', chainLength: 768, ipDomain: 'ANALOG', risk: 'High', shiftCycles: 384, captureWindows: 8, passRate: 99.2, cellsFailed: 6, cellsPassed: 762, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_009 chains
          { patternId: 'PAT_009', chainId: 'CHAIN_011', flipFlopFailures: 3, faultClassType: 'Stuck-at-0', chainLength: 512, ipDomain: 'CPU', risk: 'Medium', shiftCycles: 256, captureWindows: 4, passRate: 99.4, cellsFailed: 3, cellsPassed: 509, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_010 chains
          { patternId: 'PAT_010', chainId: 'CHAIN_012', flipFlopFailures: 9, faultClassType: 'Bridging Fault', chainLength: 640, ipDomain: 'LOGIC', risk: 'High', shiftCycles: 320, captureWindows: 6, passRate: 98.5, cellsFailed: 9, cellsPassed: 631, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_011 chains
          { patternId: 'PAT_011', chainId: 'CHAIN_015', flipFlopFailures: 15, faultClassType: 'Transition Fault', chainLength: 640, ipDomain: 'GPU', risk: 'Critical', shiftCycles: 320, captureWindows: 6, passRate: 96.8, cellsFailed: 15, cellsPassed: 625, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_012 chains
          { patternId: 'PAT_012', chainId: 'CHAIN_016', flipFlopFailures: 4, faultClassType: 'Stuck-at-1', chainLength: 512, ipDomain: 'MEMORY', risk: 'Medium', shiftCycles: 256, captureWindows: 4, passRate: 99.2, cellsFailed: 4, cellsPassed: 508, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_013 chains
          { patternId: 'PAT_013', chainId: 'CHAIN_017', flipFlopFailures: 7, faultClassType: 'Bridging Fault', chainLength: 576, ipDomain: 'IO', risk: 'High', shiftCycles: 288, captureWindows: 5, passRate: 98.6, cellsFailed: 7, cellsPassed: 569, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_014 chains
          { patternId: 'PAT_014', chainId: 'CHAIN_018', flipFlopFailures: 1, faultClassType: 'Stuck-at-0', chainLength: 768, ipDomain: 'CPU', risk: 'Low', shiftCycles: 384, captureWindows: 8, passRate: 99.8, cellsFailed: 1, cellsPassed: 767, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_015 chains
          { patternId: 'PAT_015', chainId: 'CHAIN_019', flipFlopFailures: 11, faultClassType: 'Stuck-at-1', chainLength: 640, ipDomain: 'LOGIC', risk: 'High', shiftCycles: 320, captureWindows: 6, passRate: 97.9, cellsFailed: 11, cellsPassed: 629, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_016 chains
          { patternId: 'PAT_016', chainId: 'CHAIN_020', flipFlopFailures: 3, faultClassType: 'Open Fault', chainLength: 512, ipDomain: 'GPU', risk: 'Medium', shiftCycles: 256, captureWindows: 4, passRate: 99.3, cellsFailed: 3, cellsPassed: 509, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_017 chains
          { patternId: 'PAT_017', chainId: 'CHAIN_021', flipFlopFailures: 8, faultClassType: 'Transition Fault', chainLength: 576, ipDomain: 'CPU', risk: 'High', shiftCycles: 288, captureWindows: 5, passRate: 98.2, cellsFailed: 8, cellsPassed: 568, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_018 chains
          { patternId: 'PAT_018', chainId: 'CHAIN_022', flipFlopFailures: 0, faultClassType: 'Stuck-at-0', chainLength: 768, ipDomain: 'MEMORY', risk: 'Low', shiftCycles: 384, captureWindows: 8, passRate: 100.0, cellsFailed: 0, cellsPassed: 768, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_019 chains
          { patternId: 'PAT_019', chainId: 'CHAIN_023', flipFlopFailures: 5, faultClassType: 'Bridging Fault', chainLength: 512, ipDomain: 'ANALOG', risk: 'High', shiftCycles: 256, captureWindows: 4, passRate: 98.9, cellsFailed: 5, cellsPassed: 507, lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // PAT_020 chains
          { patternId: 'PAT_020', chainId: 'CHAIN_024', flipFlopFailures: 12, faultClassType: 'Stuck-at-1', chainLength: 576, ipDomain: 'IO', risk: 'High', shiftCycles: 288, captureWindows: 5, passRate: 97.7, cellsFailed: 12, cellsPassed: 564, lotId: 'LOT-2024-042', fabId: 'fab-001' },
        ];
        for (const c of chains) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO scan_chains (pattern_id, chain_id, flip_flop_failures, fault_class_type, chain_length, ip_domain, risk, shift_cycles, capture_windows, pass_rate, cells_failed, cells_passed, lot_id, fab_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT DO NOTHING`,
            c.patternId, c.chainId, c.flipFlopFailures, c.faultClassType, c.chainLength, c.ipDomain, c.risk, c.shiftCycles, c.captureWindows, c.passRate, c.cellsFailed, c.cellsPassed, c.lotId, c.fabId
          );
        }

        // 6. Seed flip_flop_failures
        this.logger.log('Seeding flip_flop_failures (4 active chain failure sets)...');
        const failures = [
          // CHAIN_001 flip-flops
          { chainId: 'CHAIN_001', flipFlopId: 'FF_001', failureCount: 10, faultType: 'Stuck-at-0', captureCycle: 12, severity: 'Critical', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_001', flipFlopId: 'FF_002', failureCount: 8, faultType: 'Bridging Fault', captureCycle: 7, severity: 'Critical', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_001', flipFlopId: 'FF_003', failureCount: 5, faultType: 'Stuck-at-1', captureCycle: 3, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_001', flipFlopId: 'FF_004', failureCount: 4, faultType: 'Transition Fault', captureCycle: 9, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_001', flipFlopId: 'FF_005', failureCount: 2, faultType: 'Bridging Fault', captureCycle: 15, severity: 'Medium', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_001', flipFlopId: 'FF_006', failureCount: 1, faultType: 'Open Fault', captureCycle: 6, severity: 'Low', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // CHAIN_002 flip-flops
          { chainId: 'CHAIN_002', flipFlopId: 'FF_011', failureCount: 8, faultType: 'Stuck-at-1', captureCycle: 4, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // CHAIN_003 flip-flops
          { chainId: 'CHAIN_003', flipFlopId: 'FF_021', failureCount: 9, faultType: 'Transition Fault', captureCycle: 8, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // CHAIN_004 flip-flops
          { chainId: 'CHAIN_004', flipFlopId: 'FF_031', failureCount: 2, faultType: 'Stuck-at-0', captureCycle: 11, severity: 'Medium', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // CHAIN_005 flip-flops
          { chainId: 'CHAIN_005', flipFlopId: 'FF_041', failureCount: 1, faultType: 'Open Fault', captureCycle: 2, severity: 'Low', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // CHAIN_015 flip-flops (PAT_011 Critical GPU)
          { chainId: 'CHAIN_015', flipFlopId: 'FF_101', failureCount: 5, faultType: 'Transition Fault', captureCycle: 10, severity: 'Critical', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_015', flipFlopId: 'FF_102', failureCount: 4, faultType: 'Transition Fault', captureCycle: 14, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_015', flipFlopId: 'FF_103', failureCount: 3, faultType: 'Transition Fault', captureCycle: 2, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_015', flipFlopId: 'FF_104', failureCount: 2, faultType: 'Transition Fault', captureCycle: 18, severity: 'Medium', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_015', flipFlopId: 'FF_105', failureCount: 1, faultType: 'Transition Fault', captureCycle: 22, severity: 'Low', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // CHAIN_020 flip-flops (PAT_016 GPU Medium)
          { chainId: 'CHAIN_020', flipFlopId: 'FF_111', failureCount: 2, faultType: 'Open Fault', captureCycle: 3, severity: 'Medium', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_020', flipFlopId: 'FF_112', failureCount: 1, faultType: 'Open Fault', captureCycle: 5, severity: 'Low', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          // CHAIN_024 flip-flops (PAT_020 IO High)
          { chainId: 'CHAIN_024', flipFlopId: 'FF_121', failureCount: 4, faultType: 'Stuck-at-1', captureCycle: 8, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_024', flipFlopId: 'FF_122', failureCount: 3, faultType: 'Stuck-at-1', captureCycle: 19, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_024', flipFlopId: 'FF_123', failureCount: 3, faultType: 'Stuck-at-1', captureCycle: 1, severity: 'High', lotId: 'LOT-2024-042', fabId: 'fab-001' },
          { chainId: 'CHAIN_024', flipFlopId: 'FF_124', failureCount: 2, faultType: 'Stuck-at-1', captureCycle: 14, severity: 'Medium', lotId: 'LOT-2024-042', fabId: 'fab-001' }
        ];
        for (const f of failures) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO flip_flop_failures (chain_id, flip_flop_id, failure_count, fault_type, capture_cycle, severity, lot_id, fab_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            f.chainId, f.flipFlopId, f.failureCount, f.faultType, f.captureCycle, f.severity, f.lotId, f.fabId
          );
        }
      }

      this.logger.log('Provisioning and seeding completed successfully!');
    } catch (error) {
      this.logger.error('Error during database provisioning and seeding:', error);
    }
  }

  /**
   * Endpoint 1: GET /api/patterns
   * Query patterns using raw SQL and Redis cache (5 mins TTL)
   */
  async getPatterns(fabId?: string, from?: string, to?: string, search?: string): Promise<any[]> {
    const fabKey = fabId || 'all';
    const filterData = JSON.stringify({
      from,
      to,
      search,
    });
    const filterHash = require('crypto').createHash('md5').update(filterData).digest('hex');
    const cacheKey = `patterns:${fabKey}:${filterHash}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log(`[Cache Hit] Serving patterns from key: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.error('Redis cache get error:', err);
    }

    this.logger.log(`[Cache Miss] Executing database query for key: ${cacheKey}`);

    let sql = `
      SELECT
        pattern_id as "patternId",
        COUNT(DISTINCT chain_id) FILTER (WHERE flip_flop_failures > 0)::integer AS "failedChains",
        ROUND(
          COALESCE(
            COUNT(DISTINCT chain_id) FILTER (WHERE flip_flop_failures > 0) * 100.0 /
            NULLIF(COUNT(DISTINCT chain_id), 0),
            0.0
          ), 2
        )::float AS "failRate"
      FROM scan_chains
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (fabId) {
      sql += ` AND fab_id = $${paramIndex++}`;
      params.push(fabId);
    }

    if (from && to) {
      sql += ` AND captured_at BETWEEN $${paramIndex++}::timestamp AND $${paramIndex++}::timestamp`;
      params.push(from, to);
    }

    if (search) {
      sql += ` AND pattern_id ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }

    sql += `
      GROUP BY pattern_id
      ORDER BY "failedChains" DESC
    `;

    const result: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);

    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 300); // 5 mins TTL
    } catch (err) {
      this.logger.error('Redis cache set error:', err);
    }

    return result;
  }

  /**
   * Endpoint 2: GET /api/patterns/:patternId/chains
   * Query chains for a pattern using Redis cache (3 mins TTL)
   */
  async getChains(patternId: string, fabId?: string, from?: string, to?: string): Promise<any[]> {
    const cacheKey = `chains:${patternId}:${fabId || 'all'}:${from || 'all'}:${to || 'all'}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log(`[Cache Hit] Serving chains from key: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.error('Redis cache get error:', err);
    }

    this.logger.log(`[Cache Miss] Executing database query for key: ${cacheKey}`);

    let sql = `
      SELECT
        chain_id as "chainId",
        flip_flop_failures::integer as "flipFlopFailures",
        fault_class_type as "faultType",
        chain_length::integer as "chainLength",
        ip_domain as "ipDomain",
        risk,
        shift_cycles::integer as "shiftCycles",
        capture_windows::integer as "captureWindows",
        pass_rate::float as "passRate",
        cells_failed::integer as "cellsFailed",
        cells_passed::integer as "cellsPassed"
      FROM scan_chains
      WHERE pattern_id = $1
    `;

    const params: any[] = [patternId];
    let paramIndex = 2;

    if (fabId) {
      sql += ` AND fab_id = $${paramIndex++}`;
      params.push(fabId);
    }

    if (from && to) {
      sql += ` AND captured_at BETWEEN $${paramIndex++}::timestamp AND $${paramIndex++}::timestamp`;
      params.push(from, to);
    }

    sql += `
      ORDER BY
        CASE risk
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END ASC,
        "flipFlopFailures" DESC
    `;

    const result: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);

    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 180); // 3 mins TTL
    } catch (err) {
      this.logger.error('Redis cache set error:', err);
    }

    return result;
  }

  /**
   * Endpoint 3: GET /api/chains/:chainId/flipflops
   * Query flip flops for a chain using Redis cache (2 mins TTL)
   */
  async getFlipFlops(chainId: string, fabId?: string, from?: string, to?: string): Promise<any[]> {
    const cacheKey = `flipflops:${chainId}:${fabId || 'all'}:${from || 'all'}:${to || 'all'}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log(`[Cache Hit] Serving flip-flops from key: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.error('Redis cache get error:', err);
    }

    this.logger.log(`[Cache Miss] Executing database query for key: ${cacheKey}`);

    let sql = `
      SELECT
        flip_flop_id as "flipFlopId",
        failure_count::integer as "failureCount",
        fault_type as "faultType",
        capture_cycle::integer as "captureCycle",
        severity
      FROM flip_flop_failures
      WHERE chain_id = $1
    `;

    const params: any[] = [chainId];
    let paramIndex = 2;

    if (fabId) {
      sql += ` AND fab_id = $${paramIndex++}`;
      params.push(fabId);
    }

    if (from && to) {
      sql += ` AND captured_at BETWEEN $${paramIndex++}::timestamp AND $${paramIndex++}::timestamp`;
      params.push(from, to);
    }

    sql += `
      ORDER BY "failureCount" DESC,
        CASE severity
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END ASC
    `;

    const result: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);

    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 120); // 2 mins TTL
    } catch (err) {
      this.logger.error('Redis cache set error:', err);
    }

    return result;
  }
}
