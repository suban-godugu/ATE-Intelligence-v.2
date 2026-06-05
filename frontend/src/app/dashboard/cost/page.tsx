'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/api/client';


export default function CostIntelligencePage() {
  const [activeTab, setActiveTab] = useState('ov');
  const [tog3d, setTog3d] = useState(true);
  
  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [roiResult, setRoiResult] = useState<any>(null);
  
  // ROI Slider state
  const [roiState, setRoiState] = useState({
    lots: 200,
    dies: 800,
    wafers: 25,
    rate: 0.012,
    tsaved: 1560
  });

  useEffect(() => {
    // Fetch initial data using robust apiClient
    apiClient.get('/cost/summary').then(res => setSummary(res.data)).catch(console.error);
    apiClient.get('/cost/trend').then(res => setTrend(res.data)).catch(console.error);
    apiClient.get('/cost/breakdown').then(res => setBreakdown(res.data)).catch(console.error);
    apiClient.get('/cost/heatmap').then(res => setHeatmap(res.data)).catch(console.error);
    apiClient.get('/cost/patterns').then(res => setPatterns(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    // Re-simulate ROI when sliders change using robust apiClient
    apiClient.post('/cost/simulate', {
      lotsPerMo: roiState.lots,
      diesPerWafer: roiState.dies,
      wafersPerLot: roiState.wafers,
      ratePerSec: roiState.rate,
      timeSavedMs: roiState.tsaved
    }).then(res => setRoiResult(res.data)).catch(console.error);
  }, [roiState]);

  const handleRoiChange = (key: string, val: number) => {
    setRoiState(prev => ({ ...prev, [key]: val }));
  };

  const colMap = [
    'rgba(16, 185, 129, 0.08)',
    'rgba(16, 185, 129, 0.22)',
    'rgba(245, 158, 11, 0.15)',
    'rgba(245, 158, 11, 0.32)',
    'rgba(239, 68, 68, 0.2)',
    'rgba(239, 68, 68, 0.45)',
    'rgba(244, 63, 94, 0.65)',
    'var(--accent-red)'
  ];

  if (!summary) return <div className="p-8 text-center text-[var(--tx-secondary)] animate-pulse">Loading Cost Intelligence...</div>;

  return (
    <div className="ci-container animate-fade-in space-y-5 pb-12">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="pl-4" style={{ borderLeft: '3px solid', borderImage: 'linear-gradient(to bottom, var(--accent-amber), transparent) 1' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[var(--accent-amber)] font-bold select-none">[$]</span>
            <h1
              className="text-[20px] font-bold"
              style={{ color: 'var(--tx-primary)', letterSpacing: '-0.02em' }}
            >
              Cost Intelligence
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--tx-secondary)' }}>
            Semiconductor test cost analysis, breakdown, and ROI simulation
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select className="ci-sel"><option>All Fabs</option><option>Fab A</option><option>Fab B</option><option>Fab C</option></select>
          <select className="ci-sel"><option>Last 30 days</option><option>Last 7 days</option><option>Last 90 days</option></select>
          <button className="ci-bs">EXPORT</button>
        </div>
      </div>

      {/* TABS — pill bar */}
      <div
        className="flex items-center gap-1 p-1 overflow-x-auto scrollbar-none border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]"
        style={{
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {[
          { id: 'ov',  label: 'OVERVIEW' },
          { id: 'cb',  label: 'COST BREAKDOWN' },
          { id: 'wh',  label: 'WAFER HEATMAP' },
          { id: 'pc',  label: 'PATTERN COST' },
          { id: 'roi', label: 'ROI SIMULATOR' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] text-[11px] font-mono font-semibold transition-all duration-150 whitespace-nowrap shrink-0"
            style={activeTab === tab.id
              ? { background: 'var(--accent-amber)', color: '#fff', boxShadow: '0 0 12px rgba(245,158,11,0.25)' }
              : { color: 'var(--tx-secondary)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* TAB 1: OVERVIEW */}
      <div className={`ci-tc ${activeTab==='ov'?'on':''}`}>
        <div className="ci-krow">
          <div className="ci-kpi"><div className="ci-kl">Total test cost</div><div className="ci-kv">${summary.totalCost.toLocaleString()}</div><div className="ci-kd red font-mono">▲ {typeof summary.deltas.totalCost === 'object' ? `${summary.deltas.totalCost.percent}%` : summary.deltas.totalCost}</div></div>
          <div className="ci-kpi"><div className="ci-kl">Cost/wafer</div><div className="ci-kv">${summary.costPerWafer}</div><div className="ci-kd green font-mono">▼ {typeof summary.deltas.costPerWafer === 'object' ? `${summary.deltas.costPerWafer.percent}%` : summary.deltas.costPerWafer}</div></div>
          <div className="ci-kpi"><div className="ci-kl">Cost/die</div><div className="ci-kv">${summary.costPerDie}</div><div className="ci-kd green font-mono">▼ {typeof summary.deltas.costPerDie === 'object' ? `${summary.deltas.costPerDie.percent}%` : summary.deltas.costPerDie}</div></div>
          <div className="ci-kpi"><div className="ci-kl">Test time avg</div><div className="ci-kv">{summary.testTimeAvg.toLocaleString()}ms</div><div className="ci-kd red font-mono">▲ {typeof summary.deltas.testTimeAvg === 'object' ? `${summary.deltas.testTimeAvg.percent}%` : summary.deltas.testTimeAvg}</div></div>
          <div className="ci-kpi"><div className="ci-kl">Yield overall</div><div className="ci-kv" style={{ color: 'var(--accent-green)' }}>{summary.yield}%</div><div className="ci-kd green font-mono">▲ {typeof summary.deltas.yield === 'object' ? `${summary.deltas.yield.percent}%` : summary.deltas.yield}</div></div>
          <div className="ci-kpi"><div className="ci-kl">ROI improvement</div><div className="ci-kv" style={{ color: 'var(--accent-purple)' }}>${summary.roiImprovement.toLocaleString()}</div><div className="ci-kd">From optimizations</div></div>
        </div>
        
        <div className="ci-g2">
          <div className="ci-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ci-ch">
              <div><div className="ci-ct">Cost trend — last 30 days</div><div className="ci-cs">Total test cost per day ($)</div></div>
              <div className="ci-chip font-mono text-[9px] select-none">[ AI TRACKED ]</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 'var(--radius-md)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--tx-secondary)', marginBottom: 6 }}>
                <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
                {trend?.days.map((d: any, i: number) => (
                  <div key={i} style={{ flex:1, background: d.type==='spike' ? 'var(--accent-orange)' : d.type==='post-opt' ? 'var(--accent-green)' : 'var(--accent-purple)', height: `${d.heightPct}%`, borderRadius: '2px 2px 0 0' }}></div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 9, color: 'var(--tx-secondary)', marginTop: 8, justifyContent: 'center' }}>
                <div className="ci-flex-center"><span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent-purple)' }}></span> Normal</div>
                <div className="ci-flex-center"><span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent-orange)' }}></span> Spike</div>
                <div className="ci-flex-center"><span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent-green)' }}></span> Post-optimiz.</div>
              </div>
            </div>
          </div>
          
          <div className="ci-card">
            <div className="ci-ch">
              <div className="ci-ct">AI cost recommendations</div>
              <div className="ci-chip font-mono text-[9px] select-none">[ TOP 3 ACTIONS ]</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-secondary)' }}>1</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx-primary)' }}>Apply 64x compression on Scan Chain</div>
                  <div style={{ fontSize: 10, color: 'var(--tx-secondary)', marginTop: 2 }}>Save $0.014/die · 48% test time reduction</div>
                </div>
                <div className="ci-bgg">$18,200/mo</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-secondary)' }}>2</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx-primary)' }}>Remove 9 redundant patterns</div>
                  <div style={{ fontSize: 10, color: 'var(--tx-secondary)', marginTop: 2 }}>Save $0.021/die · zero coverage loss</div>
                </div>
                <div className="ci-bgg">$12,400/mo</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-secondary)' }}>3</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx-primary)' }}>Reorder test flow (MBIST first)</div>
                  <div style={{ fontSize: 10, color: 'var(--tx-secondary)', marginTop: 2 }}>+1.2% yield · early exit on fail</div>
                </div>
                <div className="ci-bgg">$10,600/mo</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="ci-card">
          <div className="ci-ch"><div className="ci-ct">Cost by fab — comparison</div></div>
          <table className="ci-tbl">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Fab</th><th style={{ width: '14%' }}>Total cost</th><th style={{ width: '13%' }}>Cost/wafer</th>
                <th style={{ width: '12%' }}>Cost/die</th><th style={{ width: '11%' }}>Yield</th><th style={{ width: '12%' }}>Test time</th>
                <th style={{ width: '13%' }}>Lots</th><th style={{ width: '13%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Fab A</td><td>$98,200</td><td>$11.82</td><td>$0.0401</td><td style={{ color: 'var(--accent-green)' }}>89.1%</td><td>4,620ms</td><td>241</td><td><span className="ci-bgg">Optimal</span></td></tr>
              <tr><td>Fab B</td><td>$87,440</td><td>$12.18</td><td>$0.0422</td><td style={{ color: 'var(--accent-green)' }}>87.4%</td><td>4,810ms</td><td>198</td><td><span className="ci-bgb">Normal</span></td></tr>
              <tr><td>Fab C</td><td>$62,780</td><td>$14.21</td><td>$0.0511</td><td style={{ color: 'var(--accent-orange)' }}>84.2%</td><td>5,240ms</td><td>142</td><td><span className="ci-bga">Review</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* TAB 2: COST BREAKDOWN */}
      <div className={`ci-tc ${activeTab==='cb'?'on':''}`}>
        <div className="ci-krow">
          {breakdown?.categories.map((c: any, i: number) => (
            <div className="ci-kpi" key={i}><div className="ci-kl">{c.name}</div><div className="ci-kv" style={{ color: c.name==='Yield loss' ? 'var(--accent-red)' : undefined }}>${c.amount.toLocaleString()}</div><div className="ci-kd">{c.pct}% of total</div></div>
          ))}
          <div className="ci-kpi"><div className="ci-kl">Total</div><div className="ci-kv">${summary.totalCost.toLocaleString()}</div><div className="ci-kd">This period</div></div>
        </div>
        
        <div className="ci-g2">
          <div className="ci-card">
            <div className="ci-ch"><div className="ci-ct">Cost by category</div></div>
            {breakdown?.categories.map((c: any, i: number) => (
              <div className="ci-mb" key={i}>
                <div style={{ width: 80 }}>{c.name}</div>
                <div className="ci-pw"><div className="ci-pb" style={{ width: `${c.pct}%`, background: c.color }}></div></div>
                <div style={{ width: 100, textAlign: 'right', color: c.name==='Yield loss' ? 'var(--accent-red)' : 'var(--tx-secondary)' }}>${c.amount.toLocaleString()} · {c.pct}%</div>
              </div>
            ))}
          </div>
          <div className="ci-card">
            <div className="ci-ch"><div className="ci-ct">Cost by test type</div></div>
            {breakdown?.testTypes.map((t: any, i: number) => (
              <div className="ci-mb" key={i}>
                <div style={{ width: 80 }}>{t.name}</div>
                <div className="ci-pw"><div className="ci-pb" style={{ width: `${t.pct}%`, background: t.color }}></div></div>
                <div style={{ width: 100, textAlign: 'right', color: 'var(--tx-secondary)' }}>{t.ms.toLocaleString()}ms · ${t.cost.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="ci-card">
          <div className="ci-ch"><div className="ci-ct">Cost driver detail — per lot</div></div>
          <table className="ci-tbl">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Lot ID</th><th style={{ width: '10%' }}>Fab</th><th style={{ width: '13%' }}>Total cost</th>
                <th style={{ width: '12%' }}>Cost/die</th><th style={{ width: '12%' }}>Test time</th><th style={{ width: '11%' }}>Yield</th>
                <th style={{ width: '12%' }}>Yield loss $</th><th style={{ width: '16%' }}>Top driver</th>
              </tr>
            </thead>
            <tbody>
              {breakdown?.lots.map((l: any, i: number) => (
                <tr key={i}>
                  <td className="ci-font-mono">{l.id}</td><td>{l.fab}</td><td>${l.totalCost.toLocaleString()}</td><td>${l.costPerDie.toFixed(4)}</td>
                  <td>{l.testTimeMs.toLocaleString()}ms</td>
                  <td style={{ color: l.yield > 85 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{l.yield}%</td>
                  <td>${l.yieldLossUsd.toLocaleString()}</td>
                  <td>
                    <span className={l.topDriver==='Scan chain'?'ci-bgb':l.topDriver==='Yield loss'?'ci-bgr':l.topDriver==='ATPG time'?'ci-bga':'ci-bgt'}>{l.topDriver}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* TAB 3: WAFER HEATMAP */}
      <div className={`ci-tc ${activeTab==='wh'?'on':''}`}>
        <div className="ci-krow col4">
          <div className="ci-kpi"><div className="ci-kl">Avg cost/die</div><div className="ci-kv">${summary.costPerDie}</div></div>
          <div className="ci-kpi"><div className="ci-kl">High-cost dies</div><div className="ci-kv" style={{ color: 'var(--accent-red)' }}>142</div><div className="ci-kd">2.8% of wafer</div></div>
          <div className="ci-kpi"><div className="ci-kl">Spatial clusters</div><div className="ci-kv" style={{ color: 'var(--accent-amber)' }}>3</div><div className="ci-kd">Edge + center</div></div>
          <div className="ci-kpi"><div className="ci-kl">3D view</div><div className="ci-kv" style={{ fontSize: 13 }}>Toggle below</div></div>
        </div>
        
        <div className="ci-card">
          <div className="ci-ch">
            <div><div className="ci-ct">Wafer cost heatmap (spatial AI)</div><div className="ci-cs">Click any zone to drill into die-level cost</div></div>
            <div className="ci-flex-center">
              <div onClick={() => setTog3d(!tog3d)} style={{ width: 36, height: 18, borderRadius: 9, background: tog3d ? 'var(--accent-blue)' : '#888780', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2, transition: '0.2s' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', marginLeft: tog3d ? 'auto' : 0, transition: '0.2s' }}></div>
              </div>
              <span style={{ color: tog3d ? 'var(--accent-blue)' : 'var(--tx-secondary)', fontWeight: 500, fontSize: 11 }}>{tog3d ? 'On' : 'Off'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 15 }}>
            <div style={{ flex: 1 }}>
              <div className="ci-heatmap">
                {heatmap?.grid.map((row: number[], r: number) => row.map((v: number, c: number) => (
                  <div 
                    key={`${r}-${c}`} 
                    className="ci-hc" 
                    style={{ background: colMap[v-1], color: v>=4 ? '#FAEEDA' : v>=3 ? '#633806' : '#3B6D11' }}
                    title={`Row ${r+1} Col ${c+1} · $0.0${Math.round(38+v*4)}/die`}
                  >
                    {v>=4 ? `$0.0${Math.round(38+v*4)}` : ''}
                  </div>
                )))}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 15, fontSize: 10, color: 'var(--tx-secondary)' }}>
                <div className="ci-flex-center"><span style={{ width:8, height:8, borderRadius:2, background:'#EAF3DE' }}></span> Low</div>
                <div className="ci-flex-center"><span style={{ width:8, height:8, borderRadius:2, background:'#FAC775' }}></span> Med</div>
                <div className="ci-flex-center"><span style={{ width:8, height:8, borderRadius:2, background:'#E24B4A' }}></span> High</div>
                <div className="ci-flex-center"><span style={{ width:8, height:8, borderRadius:2, background:'#501313' }}></span> Defect</div>
              </div>
            </div>
            <div style={{ width: 160, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>Zone summary</div>
              {heatmap?.clusters.map((cl: any, i: number) => (
                <div className="ci-fr" key={i}>
                  <span className="ci-fl">{cl.zone}</span>
                  <span className="ci-fv" style={{ color: cl.cost > 0.05 ? 'var(--accent-red)' : '#3B6D11' }}>
                    {cl.zone === 'Defect cluster' ? '3 zones' : `$${cl.cost.toFixed(3)}`}
                  </span>
                </div>
              ))}
              <button className="ci-bp" style={{ width: '100%', marginTop: 10 }}>Analyse clusters ↗</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* TAB 4: PATTERN COST */}
      <div className={`ci-tc ${activeTab==='pc'?'on':''}`}>
        <div className="ci-krow col4">
          <div className="ci-kpi"><div className="ci-kl">Total patterns</div><div className="ci-kv">{patterns?.total.toLocaleString()}</div></div>
          <div className="ci-kpi"><div className="ci-kl">Highest cost</div><div className="ci-kv" style={{ color: 'var(--accent-red)', fontSize: 14 }}>PT_077</div><div className="ci-kd">$0.00182/die</div></div>
          <div className="ci-kpi"><div className="ci-kl">Avg cost/pattern</div><div className="ci-kv">$0.00034</div></div>
          <div className="ci-kpi"><div className="ci-kl">Removable cost</div><div className="ci-kv" style={{ color: 'var(--accent-green)' }}>$0.021/die</div><div className="ci-kd">9 redundant patterns</div></div>
        </div>
        
        <div className="ci-card">
          <div className="ci-ch">
            <div><div className="ci-ct">Pattern cost analysis</div><div className="ci-cs">Cost (USD) · fail rate · detect · power · ROI score</div></div>
            <div className="ci-flex-center" style={{ gap: 6 }}>
              <select className="ci-sel"><option>All types</option><option>ATPG</option><option>MBIST</option><option>Scan</option></select>
              <select className="ci-sel"><option>Sort: Cost desc</option><option>Sort: ROI score</option><option>Sort: Fail rate</option></select>
            </div>
          </div>
          <table className="ci-tbl">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Pattern ID</th><th style={{ width: '10%' }}>Type</th><th style={{ width: '11%' }}>Test time</th>
                <th style={{ width: '11%' }}>Cost (USD)</th><th style={{ width: '10%' }}>Fail rate</th><th style={{ width: '11%' }}>Detect%</th>
                <th style={{ width: '9%' }}>Power</th><th style={{ width: '11%' }}>ROI score</th><th style={{ width: '14%' }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {patterns?.patterns.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="ci-font-mono">{p.id}</td><td>{p.type}</td><td>{p.testTimeMs}ms</td><td>${p.costUsd.toFixed(5)}</td>
                  <td><span className={p.failRate > 5 ? 'ci-bgr' : 'ci-bgg'}>{p.failRate}%</span></td>
                  <td>{p.detectPct}%</td><td>{p.power}</td>
                  <td><span className={p.roiScore < 0.2 ? 'ci-bgr' : p.roiScore < 0.8 ? 'ci-bga' : 'ci-bgg'}>{p.roiScore.toFixed(2)}</span></td>
                  <td><span className={p.recommendation.includes('Remove') ? 'ci-bgr' : p.recommendation.includes('Monitor') ? 'ci-bga' : 'ci-bgg'}>{p.recommendation}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ci-flex-between" style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--tx-secondary)' }}>Showing 1–5 of 1,284 · ROI score: 0 = waste, 1 = essential</span>
            <div className="ci-flex-center" style={{ gap: 4 }}>
              <button className="ci-bs" style={{ padding: '3px 7px', fontSize: 10 }}>Prev</button>
              <button className="ci-bs" style={{ padding: '3px 7px', fontSize: 10 }}>Next</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* TAB 5: ROI SIMULATOR */}
      <div className={`ci-tc ${activeTab==='roi'?'on':''}`}>
        <div className="ci-krow col4">
          <div className="ci-kpi"><div className="ci-kl">Projected annual saving</div><div className="ci-kv" style={{ color:'var(--accent-green)' }}>${roiResult?.annualSaving.toLocaleString() ?? '...'}</div></div>
          <div className="ci-kpi"><div className="ci-kl">Cost/die reduction</div><div className="ci-kv" style={{ color:'var(--accent-green)' }}>${roiResult?.dieSaving.toFixed(4) ?? '...'}</div></div>
          <div className="ci-kpi"><div className="ci-kl">Yield improvement</div><div className="ci-kv" style={{ color:'var(--accent-green)' }}>+1.7%</div></div>
          <div className="ci-kpi"><div className="ci-kl">Payback period</div><div className="ci-kv">{roiResult?.paybackMonths.toFixed(1) ?? '...'} mo</div></div>
        </div>
        
        <div className="ci-g2">
          <div className="ci-card">
            <div className="ci-ch">
              <div><div className="ci-ct">Simulation inputs</div><div className="ci-cs">Adjust to model different scenarios</div></div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="ci-roi-row"><div className="ci-roi-lbl">Lots per month</div><input type="range" min="50" max="500" value={roiState.lots} step="10" onChange={e => handleRoiChange('lots', +e.target.value)}/><div className="ci-roi-val">{roiState.lots}</div></div>
              <div className="ci-roi-row"><div className="ci-roi-lbl">Dies per wafer</div><input type="range" min="100" max="2000" value={roiState.dies} step="50" onChange={e => handleRoiChange('dies', +e.target.value)}/><div className="ci-roi-val">{roiState.dies}</div></div>
              <div className="ci-roi-row"><div className="ci-roi-lbl">Wafers per lot</div><input type="range" min="10" max="50" value={roiState.wafers} step="1" onChange={e => handleRoiChange('wafers', +e.target.value)}/><div className="ci-roi-val">{roiState.wafers}</div></div>
              <div className="ci-roi-row"><div className="ci-roi-lbl">Test cost/sec ($)</div><input type="range" min="0.001" max="0.05" value={roiState.rate} step="0.001" onChange={e => handleRoiChange('rate', +e.target.value)}/><div className="ci-roi-val">{roiState.rate.toFixed(3)}</div></div>
              <div className="ci-roi-row"><div className="ci-roi-lbl">Time saved ms/die</div><input type="range" min="0" max="3000" value={roiState.tsaved} step="10" onChange={e => handleRoiChange('tsaved', +e.target.value)}/><div className="ci-roi-val">{roiState.tsaved}</div></div>
            </div>
            <button className="ci-bp" style={{ width:'100%', marginTop:14 }}>Run full simulation ↗</button>
          </div>
          
          <div className="ci-card">
            <div className="ci-ch"><div className="ci-ct">Projected savings breakdown</div></div>
            <div style={{ marginTop: 10 }}>
              <div className="ci-fr"><span className="ci-fl">Compression tuner saving</span><span className="ci-fv" style={{ color:'#3B6D11' }}>$74,400/yr</span></div>
              <div className="ci-fr"><span className="ci-fl">Pattern pruning saving</span><span className="ci-fv" style={{ color:'#3B6D11' }}>$48,200/yr</span></div>
              <div className="ci-fr"><span className="ci-fl">Flow optimizer saving</span><span className="ci-fv" style={{ color:'#3B6D11' }}>$38,600/yr</span></div>
              <div className="ci-fr"><span className="ci-fl">Yield predictor gain</span><span className="ci-fv" style={{ color:'#3B6D11' }}>$52,800/yr</span></div>
              <div className="ci-fr" style={{ marginTop: 5 }}><span className="ci-fl" style={{ fontWeight: 500, color:'var(--tx-primary)' }}>Total projected saving</span><span className="ci-fv" style={{ color:'var(--accent-green)', fontSize:16 }}>${roiResult?.annualSaving.toLocaleString()}/yr</span></div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 12, marginTop: 15 }}>
              <div className="ci-fr" style={{ border:'none', paddingTop:0 }}><span className="ci-fl">Implementation cost (est.)</span><span className="ci-fv">${roiResult?.implementationCost.toLocaleString()}</span></div>
              <div className="ci-fr" style={{ border:'none' }}><span className="ci-fl">Payback period</span><span className="ci-fv">{roiResult?.paybackMonths.toFixed(1)} months</span></div>
              <div className="ci-fr" style={{ border:'none', paddingBottom:0 }}><span className="ci-fl" style={{ fontWeight: 500, color:'var(--tx-primary)' }}>12-month net ROI</span><span className="ci-fv" style={{ color:'var(--accent-green)' }}>${roiResult?.netRoi12mo.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
