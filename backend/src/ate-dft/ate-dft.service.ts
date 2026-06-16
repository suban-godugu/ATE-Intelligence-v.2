// d:\officw work -1\ai-1\backend\src\ate-dft\ate-dft.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

// ── Keyword detection rules ───────────────────
const KEYWORD_RULES: Record<string, string[]> = {
  MBIST:  ['FAIL_ADDR','MEMORY_FAIL','FAIL_ADDRESS','REPAIR_DATA','MEM_FAIL','MBIST_FAIL'],
  LBIST:  ['MISR_SIGNATURE','MISR','LBIST_RESULT','SIGNATURE_MISMATCH'],
  SCAN:   ['SCAN_CHAIN','SHIFT_FAIL','SCAN_FAIL','CHAIN_ID','STUCK_AT','SCAN_SHIFT'],
  WAFER:  ['WAFER_ID','BIN_MAP','DIE_X','DIE_Y','WAFER_MAP','YIELD_DATA'],
  ATPG:   ['ATPG_COVERAGE','COVERAGE','STUCK_AT_FAULT','PATTERN_COUNT','FAULT_COVERAGE'],
  ATE:    ['TEST_TIME','VDD','TESTER_LOG','ATE_RESULT','BINNING_RESULT'],
};
const EXT_MAP: Record<string, string> = {
  '.stdf': 'WAFER', '.stil': 'ATPG', '.wgl': 'ATPG', '.spf': 'SCAN',
};

@Injectable()
export class AteDftService {
  private readonly logger = new Logger(AteDftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Main entry point ────────────────────────
  async processFile(file: Express.Multer.File) {
    const fileId = crypto.randomUUID();
    const ext    = path.extname(file.originalname).toLowerCase();
    let content  = '';
    try { content = fs.readFileSync(file.path, { encoding: 'utf-8', flag: 'r' }).slice(0, 5000); }
    catch { content = ''; }

    const { type, confidence } = this.detectFileType(file.originalname, content, ext);
    const isDbOnline = this.prisma.isOnline();

    // Persist upload record
    if (isDbOnline) {
      try {
        await this.prisma.ateDftFile.create({
          data: {
            fileId, fileName: file.originalname,
            filePath: file.path, detectedType: type,
            confidence, status: 'detected',
            uploadTime: new Date(),
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed writing upload to Postgres: ${err.message}. Swapping to Redis fallback.`);
        await this.saveUploadToRedis(fileId, file.originalname, file.path, type, confidence, 'detected');
      }
    } else {
      await this.saveUploadToRedis(fileId, file.originalname, file.path, type, confidence, 'detected');
    }

    if (type === 'UNKNOWN') {
      return { fileId, fileName: file.originalname,
        detectedType: 'UNKNOWN', confidence, features: {}, prediction: {} };
    }

    const features   = this.parseFile(type, content);
    const prediction = this.runPrediction(type, features);

    // Save result to typed table
    await this.saveResult(type, fileId, features, prediction);
    
    if (isDbOnline) {
      try {
        await this.prisma.ateDftFile.update({
          where: { fileId }, data: { status: 'predicted' },
        });
      } catch {
        await this.updateUploadStatusInRedis(fileId, 'predicted');
      }
    } else {
      await this.updateUploadStatusInRedis(fileId, 'predicted');
    }

    return {
      fileId, fileName: file.originalname,
      detectedType: type, confidence: Math.round(confidence * 100) / 100,
      features, prediction,
    };
  }

  private async saveUploadToRedis(fileId: string, originalName: string, filePath: string, type: string, confidence: number, status: string) {
    const data = {
      fileId,
      fileName: originalName,
      filePath,
      detectedType: type,
      confidence,
      status,
      uploadTime: new Date().toISOString(),
    };
    await this.redis.set(`fallback:ateDftFile:${fileId}`, JSON.stringify(data));
    await this.redis.lpush('fallback:ateDftFiles_list', fileId);
  }

  private async updateUploadStatusInRedis(fileId: string, status: string) {
    const raw = await this.redis.get(`fallback:ateDftFile:${fileId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.status = status;
      await this.redis.set(`fallback:ateDftFile:${fileId}`, JSON.stringify(parsed));
    }
  }

  // ── File type detection ──────────────────────
  private detectFileType(filename: string, content: string, ext: string) {
    if (EXT_MAP[ext]) return { type: EXT_MAP[ext], confidence: 0.97 };

    const upper = content.toUpperCase();
    const scores: Record<string, number> = {};
    for (const [module, keywords] of Object.entries(KEYWORD_RULES)) {
      const hits = keywords.filter(k => upper.includes(k)).length;
      if (hits > 0) scores[module] = hits;
    }

    if (Object.keys(scores).length) {
      const best  = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
      const total = Object.values(scores).reduce((s, v) => s + v, 0);
      const conf  = Math.min(0.99, 0.6 + (scores[best] / total) * 0.35);
      return { type: best, confidence: conf };
    }

    for (const mod of ['mbist','lbist','scan','wafer','atpg','ate']) {
      if (filename.toLowerCase().includes(mod))
        return { type: mod.toUpperCase(), confidence: 0.72 };
    }
    return { type: 'UNKNOWN', confidence: 0 };
  }

  // ── Parsers ──────────────────────────────────
  private parseFile(type: string, content: string): Record<string, unknown> {
    switch (type) {
      case 'MBIST':  return this.parseMbist(content);
      case 'LBIST':  return this.parseLbist(content);
      case 'SCAN':   return this.parseScan(content);
      case 'WAFER':  return this.parseWafer(content);
      case 'ATPG':   return this.parseAtpg(content);
      default:       return {};
    }
  }

  private parseMbist(content: string) {
    const failAddrs  = [...content.matchAll(/FAIL_ADDR[:\s=]+([0-9A-Fa-fxX]+)/gi)].map(m => m[1]);
    const repairM    = [...content.matchAll(/REPAIR[:\s=]+(YES|NO|PASS|FAIL)/gi)].map(m => m[1]);
    const repairs    = repairM.filter(r => ['YES','PASS'].includes(r.toUpperCase())).length;
    const memType    = content.match(/MEM(?:ORY)?_TYPE[:\s=]+(\w+)/i)?.[1] ?? 'UNKNOWN';
    return {
      totalFails:    failAddrs.length,
      failAddresses: failAddrs.slice(0, 20),
      totalRepairs:  repairs,
      repairRate:    repairM.length ? Math.round(repairs / repairM.length * 1000) / 1000 : 0,
      memoryType:    memType.toUpperCase(),
    };
  }

  private parseLbist(content: string) {
    const sigs      = [...content.matchAll(/MISR(?:_SIGNATURE)?[:\s=]+([0-9A-Fa-fxX]+)/gi)].map(m => m[1]);
    const mismatch  = parseInt(content.match(/SIGNATURE_MISMATCH[:\s=]+(\d+)/i)?.[1] ?? '0');
    const coverage  = parseFloat(content.match(/COVERAGE[:\s=]+([\d.]+)/i)?.[1] ?? '0');
    const patterns  = parseInt(content.match(/PATTERN_COUNT[:\s=]+(\d+)/i)?.[1] ?? '0');
    return { misrSignatures: sigs.slice(0,10), signatureMismatch: mismatch,
             coveragePct: coverage, patternCount: patterns };
  }

  private parseScan(content: string) {
    const stuck  = [...content.matchAll(/STUCK(?:_AT)?[:\s=]+(\d+)/gi)].reduce((s,m)=>s+parseInt(m[1]),0);
    const shift  = [...content.matchAll(/SHIFT_FAIL[:\s=]+(\d+)/gi)].reduce((s,m)=>s+parseInt(m[1]),0);
    const breaks = [...content.matchAll(/(?:CHAIN_)?BREAK[:\s=]+(\d+)/gi)].reduce((s,m)=>s+parseInt(m[1]),0);
    return { totalStuckFaults: stuck, totalShiftErrors: shift,
             totalChainBreaks: breaks, chainCount: 0 };
  }

  private parseWafer(content: string) {
    const waferId  = content.match(/WAFER_ID[:\s=]+(\w+)/i)?.[1] ?? null;
    const yld      = parseFloat(content.match(/YIELD[:\s=]+([\d.]+)/i)?.[1] ?? '0');
    const total    = parseInt(content.match(/TOTAL_DIES?[:\s=]+(\d+)/i)?.[1] ?? '0');
    const fails    = parseInt(content.match(/FAIL_DIES?[:\s=]+(\d+)/i)?.[1] ?? '0');
    const hotspots = [...content.matchAll(/DIE[_\s]*X[:\s=]+\d+/gi)].length;
    return { waferId, yieldPct: yld, totalDies: total,
             failDies: fails, hotspotCount: hotspots };
  }

  private parseAtpg(content: string) {
    const cov      = parseFloat(content.match(/(?:ATPG_)?COVERAGE[:\s=]+([\d.]+)/i)?.[1] ?? '0');
    const patterns = parseInt(content.match(/PATTERN(?:_COUNT)?[:\s=]+(\d+)/i)?.[1] ?? '0');
    const undetect = parseInt(content.match(/UNDETECTED[:\s=]+(\d+)/i)?.[1] ?? '0');
    const stuck    = [...content.matchAll(/STUCK(?:_AT)?[:\s=]+(\d+)/gi)].reduce((s,m)=>s+parseInt(m[1]),0);
    return { coveragePct: cov, patternCount: patterns,
             undetectedFaults: undetect, stuckAtCount: stuck };
  }

  // ── AI Prediction (rule-based, replace with model call) ──
  private runPrediction(type: string, features: Record<string, unknown>) {
    switch (type) {
      case 'MBIST':  return this.predictMbist(features);
      case 'LBIST':  return this.predictLbist(features);
      case 'SCAN':   return this.predictScan(features);
      case 'WAFER':  return this.predictWafer(features);
      case 'ATPG':   return this.predictAtpg(features);
      default:       return { module: type, prediction: 'UNKNOWN', riskScore: 0 };
    }
  }

  private predictMbist(f: Record<string, unknown>) {
    const fails   = Number(f.totalFails ?? 0);
    const repair  = Number(f.repairRate ?? 0);
    const unique  = (f.failAddresses as string[] ?? []).length;
    let risk = Math.min(fails / 100 * 0.5 + (1 - repair) * 0.3 + Math.min(unique / 50, 0.2), 1);
    risk = Math.round(risk * 1000) / 1000;
    const label  = risk > 0.75 ? 'CRITICAL_FAILURE' : risk > 0.45 ? 'HIGH_RISK'
                 : risk > 0.2  ? 'MARGINAL'          : 'PASS';
    const recs: Record<string,string> = {
      CRITICAL_FAILURE: 'Immediate redundancy repair required. Escalate to yield team.',
      HIGH_RISK:        'Repair recommended. Monitor closely in next lot.',
      MARGINAL:         'Monitor. Consider re-test with extended pattern.',
      PASS:             'Memory test passed. No action required.',
    };
    return { module: 'MBIST', prediction: label, riskScore: risk,
             recommendation: recs[label] };
  }

  private predictLbist(f: Record<string, unknown>) {
    const mismatch = Number(f.signatureMismatch ?? 0);
    const coverage = Number(f.coveragePct ?? 0);
    let risk = Math.min(mismatch / 5 * 0.6 + Math.max(0, (90 - coverage) / 90) * 0.3, 1);
    risk = Math.round(risk * 1000) / 1000;
    const label = risk > 0.7 ? 'LOGIC_FAILURE' : risk > 0.4 ? 'DEGRADED'
                : mismatch === 0 && coverage >= 90 ? 'PASS' : 'MARGINAL';
    return { module: 'LBIST', prediction: label, riskScore: risk,
             recommendation: label === 'LOGIC_FAILURE' ? 'Debug MISR signature chain.'
               : label === 'PASS' ? 'LBIST passed.' : 'Re-run with full pattern set.' };
  }

  private predictScan(f: Record<string, unknown>) {
    const stuck  = Number(f.totalStuckFaults ?? 0);
    const shift  = Number(f.totalShiftErrors ?? 0);
    const breaks = Number(f.totalChainBreaks ?? 0);
    let risk = Math.min(stuck/20*0.4 + shift/10*0.3 + breaks/5*0.3, 1);
    risk = Math.round(risk * 1000) / 1000;
    const label = breaks > 0 ? 'BROKEN_CHAIN' : risk > 0.6 ? 'HIGH_FAULT_DENSITY'
                : risk > 0.3 ? 'MARGINAL' : 'PASS';
    return { module: 'SCAN', prediction: label, riskScore: risk,
             recommendation: breaks > 0 ? 'Scan chain broken. Run diagnosis.'
               : label === 'PASS' ? 'Scan chains healthy.' : 'High fault density detected.' };
  }

  private predictWafer(f: Record<string, unknown>) {
    const yld    = Number(f.yieldPct ?? 100);
    const fails  = Number(f.failDies ?? 0);
    const total  = Number(f.totalDies ?? 1);
    const spots  = Number(f.hotspotCount ?? 0);
    const rate   = fails / Math.max(total, 1);
    let risk = Math.min(rate * 0.7 + Math.min(spots / 20, 0.3), 1);
    risk = Math.round(risk * 1000) / 1000;
    const label = yld < 60 ? 'CRITICAL_YIELD_LOSS' : yld < 80 ? 'LOW_YIELD'
                : spots > 10 ? 'HOTSPOT_DETECTED' : yld >= 95 ? 'EXCELLENT_YIELD' : 'NORMAL_YIELD';
    return { module: 'WAFER', prediction: label, riskScore: risk,
             recommendation: yld < 60 ? 'Yield below 60%. Investigate process excursion.'
               : yld < 80 ? 'Review bin map for systematic pattern.'
               : 'Wafer yield within acceptable range.' };
  }

  private predictAtpg(f: Record<string, unknown>) {
    const cov    = Number(f.coveragePct ?? 0);
    const und    = Number(f.undetectedFaults ?? 0);
    let risk = Math.min(Math.max(0, (100 - cov) / 100) + Math.min(und / 500, 0.3), 1);
    risk = Math.round(risk * 1000) / 1000;
    const label = cov < 80 ? 'LOW_COVERAGE' : cov < 95 ? 'ACCEPTABLE_COVERAGE'
                : und > 100 ? 'UNDETECTED_FAULTS' : 'FULL_COVERAGE';
    return { module: 'ATPG', prediction: label, riskScore: risk,
             recommendation: cov < 80 ? 'Coverage below 80%. Add patterns.'
               : label === 'FULL_COVERAGE' ? 'Excellent fault coverage achieved.'
               : 'Coverage acceptable but improvement possible.' };
  }

  // ── DB save ──────────────────────────────────
  private async saveResult(type: string, fileId: string,
    features: Record<string, unknown>, prediction: Record<string, unknown>) {
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        await this.prisma.ateDftPrediction.create({
          data: {
            fileId, module: type,
            prediction:     String(prediction.prediction ?? ''),
            riskScore:      Number(prediction.riskScore ?? 0),
            recommendation: String(prediction.recommendation ?? ''),
            featuresJson:   JSON.stringify(features),
          },
        });
        return;
      } catch (err: any) {
        this.logger.warn(`Failed writing prediction to Postgres: ${err.message}. Swapping to Redis fallback.`);
      }
    }
    
    // Save to Redis
    const data = {
      id: Math.floor(Math.random() * 100000),
      fileId,
      module: type,
      prediction: String(prediction.prediction ?? ''),
      riskScore: Number(prediction.riskScore ?? 0),
      recommendation: String(prediction.recommendation ?? ''),
      featuresJson: JSON.stringify(features),
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(`fallback:ateDftPrediction:${fileId}`, JSON.stringify(data));
    await this.redis.lpush(`fallback:ateDftPredictions_list:${type.toUpperCase()}`, fileId);
  }

  // ── API getters ──────────────────────────────
  async getAllFiles() {
    let rows: any[] = [];
    if (this.prisma.isOnline()) {
      try {
        rows = await this.prisma.ateDftFile.findMany({
          orderBy: { uploadTime: 'desc' }, take: 100,
        });
      } catch (err) {
        rows = [];
      }
    }

    try {
      const redisIds = await this.redis.lrange('fallback:ateDftFiles_list', 0, 99);
      const redisRows: any[] = [];
      for (const fileId of redisIds) {
        const raw = await this.redis.get(`fallback:ateDftFile:${fileId}`);
        if (raw) {
          redisRows.push(JSON.parse(raw));
        }
      }
      const mappedDbRows = rows.map(r => ({
        fileId:       r.fileId,
        fileName:     r.fileName,
        detectedType: r.detectedType,
        confidence:   r.confidence,
        status:       r.status,
        uploadTime:   r.uploadTime instanceof Date ? r.uploadTime.toISOString() : r.uploadTime,
      }));
      const merged = [...redisRows, ...mappedDbRows];
      return merged.slice(0, 100);
    } catch {
      return rows.map(r => ({
        fileId:       r.fileId,
        fileName:     r.fileName,
        detectedType: r.detectedType,
        confidence:   r.confidence,
        status:       r.status,
        uploadTime:   r.uploadTime instanceof Date ? r.uploadTime.toISOString() : r.uploadTime,
      }));
    }
  }

  async getDashboardSummary() {
    let total = 0, mbist = 0, lbist = 0, scan = 0, wafer = 0, atpg = 0;
    if (this.prisma.isOnline()) {
      try {
        [total, mbist, lbist, scan, wafer, atpg] = await Promise.all([
          this.prisma.ateDftFile.count(),
          this.prisma.ateDftPrediction.count({ where: { module: 'MBIST' } }),
          this.prisma.ateDftPrediction.count({ where: { module: 'LBIST' } }),
          this.prisma.ateDftPrediction.count({ where: { module: 'SCAN'  } }),
          this.prisma.ateDftPrediction.count({ where: { module: 'WAFER' } }),
          this.prisma.ateDftPrediction.count({ where: { module: 'ATPG'  } }),
        ]);
      } catch {}
    }

    try {
      const client = this.redis.getClient();
      const [rTotal, rMbist, rLbist, rScan, rWafer, rAtpg] = await Promise.all([
        client.llen('fallback:ateDftFiles_list'),
        client.llen('fallback:ateDftPredictions_list:MBIST'),
        client.llen('fallback:ateDftPredictions_list:LBIST'),
        client.llen('fallback:ateDftPredictions_list:SCAN'),
        client.llen('fallback:ateDftPredictions_list:WAFER'),
        client.llen('fallback:ateDftPredictions_list:ATPG'),
      ]);
      total += rTotal || 0;
      mbist += rMbist || 0;
      lbist += rLbist || 0;
      scan += rScan || 0;
      wafer += rWafer || 0;
      atpg += rAtpg || 0;
    } catch {}

    return {
      totalFilesUploaded: total,
      mbist: { totalRecords: mbist },
      lbist: { totalRecords: lbist },
      scan:  { totalRecords: scan  },
      wafer: { totalRecords: wafer },
      atpg:  { totalRecords: atpg  },
    };
  }

  async getModuleResults(module: string) {
    const modUpper = module.toUpperCase();
    let rows: any[] = [];
    if (this.prisma.isOnline()) {
      try {
        rows = await this.prisma.ateDftPrediction.findMany({
          where:   { module: modUpper },
          orderBy: { createdAt: 'desc' },
          take:    100,
        });
      } catch {}
    }

    try {
      const redisPredictIds = await this.redis.lrange(`fallback:ateDftPredictions_list:${modUpper}`, 0, 99);
      const redisRows: any[] = [];
      for (const fileId of redisPredictIds) {
        const raw = await this.redis.get(`fallback:ateDftPrediction:${fileId}`);
        if (raw) {
          redisRows.push(JSON.parse(raw));
        }
      }
      const mappedDbRows = rows.map(r => ({
        id:             r.id,
        module:         r.module,
        prediction:     r.prediction,
        riskScore:      r.riskScore,
        recommendation: r.recommendation,
        features:       JSON.parse(r.featuresJson ?? '{}'),
        createdAt:      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      }));
      const merged = [...redisRows, ...mappedDbRows];
      return merged.slice(0, 100);
    } catch {
      return rows.map(r => ({
        id:             r.id,
        module:         r.module,
        prediction:     r.prediction,
        riskScore:      r.riskScore,
        recommendation: r.recommendation,
        features:       JSON.parse(r.featuresJson ?? '{}'),
        createdAt:      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      }));
    }
  }
}
