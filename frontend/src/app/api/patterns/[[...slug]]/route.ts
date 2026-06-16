import { NextRequest, NextResponse } from 'next/server';

// ─── Realistic Semiconductor Scan Chain Mock Data ─────────────────────────
const FAULT_TYPES = ['Stuck-At-0', 'Stuck-At-1', 'Transition', 'Path-Delay', 'Bridge', 'Cell-Aware', 'IDDQ'];
const IP_DOMAINS   = ['CPU_CORE', 'GPU_CLUSTER', 'MEMORY_CTRL', 'IO_FABRIC', 'PCIE_PHY', 'USB_PHY', 'DDR_PHY', 'NPU_ARRAY', 'DSP_ENGINE', 'CACHE_L3'];
const RISKS        = ['Critical', 'High', 'Medium', 'Low'] as const;

function rng(min: number, max: number, decimals = 0): number {
  const val = min + Math.random() * (max - min);
  return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.floor(val);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRng(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return Math.floor(min + r * (max - min));
}

// ─── Generate 38 scan chain patterns ─────────────────────────────────────
const PATTERNS = Array.from({ length: 38 }, (_, i) => {
  const n        = i + 1;
  const id       = `SCN-${String(n).padStart(4, '0')}`;
  const seed     = hashCode(id);
  const failed   = seededRng(seed,     0, 12);
  const failRate = failed === 0 ? 0 : parseFloat((seededRng(seed + 1, 10, 890) / 100).toFixed(1));
  return { patternId: id, failedChains: failed, failRate };
}).sort((a, b) => b.failedChains - a.failedChains || b.failRate - a.failRate);

// ─── Per-pattern chain data (generated deterministically) ────────────────
const CHAINS_BY_PATTERN: Record<string, any[]> = {};

for (const pat of PATTERNS) {
  const count  = pat.failedChains;
  const seed   = hashCode(pat.patternId);
  const chains = [];
  for (let c = 0; c < count; c++) {
    const s           = seed + c * 137;
    const ffFails     = seededRng(s,       1, 24);
    const chainLen    = seededRng(s + 1, 128, 4096);
    const shiftCycles = seededRng(s + 2, 256, 8192);
    const capWindows  = seededRng(s + 3,   4,   32);
    const cellsFailed = ffFails * seededRng(s + 4, 1, 4);
    const cellsPassed = chainLen - cellsFailed;
    const passRate    = parseFloat(((cellsPassed / chainLen) * 100).toFixed(1));
    const riskIdx     = ffFails > 15 ? 0 : ffFails > 8 ? 1 : ffFails > 3 ? 2 : 3;
    const ipIdx       = seededRng(s + 5, 0, IP_DOMAINS.length);
    const ftIdx       = seededRng(s + 6, 0, FAULT_TYPES.length);

    chains.push({
      chainId:          `CH-${pat.patternId}-${String(c + 1).padStart(2, '0')}`,
      flipFlopFailures: ffFails,
      faultType:        FAULT_TYPES[ftIdx],
      chainLength:      chainLen,
      ipDomain:         IP_DOMAINS[ipIdx],
      risk:             RISKS[riskIdx],
      shiftCycles,
      captureWindows:   capWindows,
      passRate,
      cellsFailed,
      cellsPassed,
    });
  }
  CHAINS_BY_PATTERN[pat.patternId] = chains;
}

// ─── Catch-all Route Handler ──────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const slug = params.slug || [];

  // If request is: /api/patterns/[patternId]/chains
  if (slug.length === 2 && slug[1] === 'chains') {
    const patternId = slug[0];
    const chains = CHAINS_BY_PATTERN[patternId] || [];
    return NextResponse.json(chains);
  }

  // Otherwise, return all patterns
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.toLowerCase();

  let result = PATTERNS;
  if (search) {
    result = PATTERNS.filter(p => p.patternId.toLowerCase().includes(search));
  }

  return NextResponse.json(result);
}
