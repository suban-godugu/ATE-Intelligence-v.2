"use client";

import { useState, useEffect } from 'react';
// No icons imported
import { sendPrompt } from '@/lib/sendPrompt';
import apiClient from '@/api/client';

export default function EquipmentPage() {
  const [activeTab, setActiveTab] = useState('ov');
  const [selectedFab, setSelectedFab] = useState('All fabs');
  const [selectedTester, setSelectedTester] = useState('All testers');
  const [selectedTaskType, setSelectedTaskType] = useState('All types');
  const [selectedAlertSeverity, setSelectedAlertSeverity] = useState('All severities');

  // API States
  const [fleetData, setFleetData] = useState<any>(null);
  const [utilisationData, setUtilisationData] = useState<any>(null);
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [alertsData, setAlertsData] = useState<any>(null);

  // Loading & Error States
  const [loading, setLoading] = useState(true);

  // Fetch Fleet/Summary on filter change
  useEffect(() => {
    let url = '/equipment/fleet';
    const params = [];
    if (selectedFab !== 'All fabs') params.push(`fab=${selectedFab}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    apiClient.get(url)
      .then(res => setFleetData(res.data))
      .catch(console.error);
  }, [selectedFab]);

  // Fetch other endpoints once on mount
  useEffect(() => {
    setLoading(true);
    const p1 = apiClient.get('/equipment/utilisation').then(res => setUtilisationData(res.data));
    const p2 = apiClient.get('/equipment/maintenance').then(res => setMaintenanceData(res.data));
    const p3 = apiClient.get('/equipment/alerts').then(res => setAlertsData(res.data));

    Promise.all([p1, p2, p3])
      .then(() => setLoading(false))
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Handler for acknowledging an alert
  const handleAcknowledgeAlert = (alertId: string) => {
    apiClient.patch(`/equipment/alerts/${alertId}/acknowledge`, { userId: 'User-1' })
      .then(() => {
        // Refresh alerts
        apiClient.get('/equipment/alerts')
          .then(res => setAlertsData(res.data))
          .catch(console.error);
      })
      .catch(console.error);
  };

  if (loading || !fleetData) {
    return (
      <div className="p-8 text-center text-[var(--tx-secondary)] animate-pulse">
        Loading Equipment Fleet Analytics...
      </div>
    );
  }

  const { testers, summary } = fleetData;
  const activeAlerts = alertsData?.alerts || [];
  const alertsSummary = alertsData?.summary || { critical: 0, warning: 0, info: 0, resolvedToday: 0 };
  const scheduledTasks = maintenanceData?.scheduled || [];
  const historyTasks = maintenanceData?.history || [];
  const idleBreakdown = utilisationData?.idleBreakdown || { plannedMaintenance: 0, unplannedFault: 0, queueWait: 0, calibration: 0, totalHrs: 0 };

  // Filter local lists if tester is chosen
  const filteredTesters = testers.filter((t: any) => {
    if (selectedTester !== 'All testers' && t.id !== selectedTester) return false;
    return true;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online': return 'eq-badge eq-bgg';
      case 'warning': return 'eq-badge eq-bga';
      case 'fault': return 'eq-badge eq-bgr';
      case 'maintenance': return 'eq-badge eq-bgb';
      default: return 'eq-badge eq-bggy';
    }
  };

  return (
    <div className="eq-container animate-fade-in space-y-5 pb-12">

      {/* PAGE HEADER — matches PatternsPage / TestOptimizationPage pattern */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="pl-4" style={{ borderLeft: '3px solid', borderImage: 'linear-gradient(to bottom, var(--accent-purple), transparent) 1' }}>
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="text-[20px] font-bold"
              style={{ color: 'var(--tx-primary)', letterSpacing: '-0.02em' }}
            >
              Equipment Intelligence
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--tx-secondary)' }}>
            ATE tester health, utilisation, and scheduled maintenance tracking
          </p>
        </div>

        {/* Inline filters + actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select className="eq-sel" value={selectedFab} onChange={e => setSelectedFab(e.target.value)}>
            <option>All fabs</option>
            <option>Fab A</option>
            <option>Fab B</option>
            <option>Fab C</option>
          </select>
          <select className="eq-sel" value={selectedTester} onChange={e => setSelectedTester(e.target.value)}>
            <option>All testers</option>
            {testers.map((t: any) => (
              <option key={t.id} value={t.id}>{t.id}</option>
            ))}
          </select>
          <button className="eq-bs" onClick={() => sendPrompt('Export fleet details as CSV')}>
            Export
          </button>
        </div>
      </div>


      {/* TABS — pill bar matching Patterns / TestOptimization */}
      <div
        className="flex items-center gap-1 p-1 overflow-x-auto scrollbar-thin"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {[
          { id: 'ov', label: 'Overview' },
          { id: 'th', label: 'Tester Health' },
          { id: 'ut', label: 'Utilisation' },
          { id: 'mt', label: 'Maintenance' },
          { id: 'al', label: 'Alerts' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-[12px] font-bold uppercase tracking-wider transition-all duration-150 whitespace-nowrap shrink-0 relative"
            style={activeTab === tab.id
              ? { background: 'var(--accent-purple)', color: '#fff', boxShadow: '0 0 12px rgba(139,92,246,0.25)' }
              : { color: 'var(--tx-secondary)' }
            }
          >
            {tab.label}
            {tab.id === 'al' && activeAlerts.length > 0 && (
              <span
                className="flex items-center justify-center text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1"
                style={{ background: 'var(--accent-red)', color: '#fff', marginLeft: 2 }}
              >
                {activeAlerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div className="eq-body">

        {/* TAB 1: OVERVIEW */}
        <div className={`eq-tc ${activeTab === 'ov' ? 'on' : ''}`}>
          <div className="eq-krow">
            <div className="eq-kpi">
              <div className="eq-kl">Total testers</div>
              <div className="eq-kv">{summary.online + summary.maintenance + summary.fault}</div>
              <div className="eq-kd">Across all fabs</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Online</div>
              <div className="eq-kv" style={{ color: '#3B6D11' }}>{summary.online}</div>
              <div className="eq-kd">75% availability</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Under maintenance</div>
              <div className="eq-kv" style={{ color: '#185FA5' }}>{summary.maintenance}</div>
              <div className="eq-kd">Scheduled PM</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Fault / offline</div>
              <div className="eq-kv" style={{ color: '#A32D2D' }}>{summary.fault}</div>
              <div className="eq-kd">ATE-07 · Fab C</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Avg utilisation</div>
              <div className="eq-kv" style={{ color: '#534AB7' }}>{summary.avgUtil}%</div>
              <div className="eq-kd">Last 7 days</div>
            </div>
          </div>

          <div className="eq-g3">
            {/* LEFT AREA (2 cols) */}
            <div className="eq-panel" style={{ gridColumn: '1 / 3' }}>
              <div className="eq-ch">
                <div>
                  <div className="eq-ct">Tester fleet overview</div>
                  <div className="eq-cs">All testers in selection · click to drill in</div>
                </div>
              </div>
              <div className="eq-g3" style={{ marginBottom: 0 }}>
                {filteredTesters.map((t: any) => (
                  <div
                    key={t.id}
                    className="eq-tester-card pointer-events-auto cursor-pointer"
                    onClick={() => {
                      setActiveTab('th');
                      sendPrompt(`Show me full health details for tester ${t.id}`);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        className="eq-health-ring"
                        style={{
                          borderColor: t.status === 'fault' ? '#A32D2D' : t.status === 'warning' ? '#854F0B' : t.status === 'maintenance' ? '#185FA5' : '#3B6D11',
                          color: t.status === 'fault' ? '#A32D2D' : t.status === 'warning' ? '#854F0B' : t.status === 'maintenance' ? '#185FA5' : '#3B6D11'
                        }}
                      >
                        {t.status === 'fault' ? '!' : t.status === 'maintenance' ? '—' : `${t.healthScore}%`}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{t.id}</div>
                        <div style={{ fontSize: 10, color: 'var(--tx-secondary)', marginTop: 2 }}>{t.fab} · {t.model}</div>
                      </div>
                      <div className={getStatusBadgeClass(t.status)} style={{ marginLeft: 'auto' }}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </div>
                    </div>
                    {t.status !== 'maintenance' && t.status !== 'fault' ? (
                      <div className="eq-mb" style={{ margin: 0 }}>
                        <div className="eq-pw">
                          <div className="eq-pb" style={{ width: `${t.utilisation7d}%`, background: '#534AB7' }}></div>
                        </div>
                        <span style={{ width: 24, textAlign: 'right' }}>{t.utilisation7d}%</span>
                      </div>
                    ) : t.status === 'fault' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#A32D2D', paddingTop: 5, borderTop: '1px dashed #F09595', marginTop: 3 }}>
                        <span className="font-bold">[!]</span> Thermal calib failure · 2h ago
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#185FA5', paddingTop: 5, borderTop: '1px dashed #A5C7F0', marginTop: 3 }}>
                        <span className="font-bold">[~]</span> PM in progress · J. Singh
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div>
              <div className="eq-panel">
                <div className="eq-ch">
                  <div className="eq-ct">Fleet status summary</div>
                </div>
                <div className="eq-fr">
                  <span className="eq-fl">Online / warning</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className="eq-pw" style={{ width: 80, flex: 'none' }}>
                      <div className="eq-pb" style={{ width: `${(summary.online / (summary.online + summary.maintenance + summary.fault)) * 100}%`, background: '#1D9E75' }}></div>
                    </div>
                    <span className="eq-fv" style={{ color: '#3B6D11', width: 34, textAlign: 'right' }}>
                      {summary.online} / {summary.online + summary.maintenance + summary.fault}
                    </span>
                  </div>
                </div>
                <div className="eq-fr">
                  <span className="eq-fl">Avg health score</span>
                  <span className="eq-fv">{summary.avgHealth}%</span>
                </div>
                <div className="eq-fr">
                  <span className="eq-fl">Avg utilisation</span>
                  <span className="eq-fv">{summary.avgUtil}%</span>
                </div>
                <div className="eq-fr">
                  <span className="eq-fl">Faults this week</span>
                  <span className="eq-fv" style={{ color: '#A32D2D' }}>{summary.faultsThisWeek} events</span>
                </div>
                <div className="eq-fr">
                  <span className="eq-fl">MTBF</span>
                  <span className="eq-fv">{summary.mtbfHrs} hrs</span>
                </div>
                <div className="eq-fr">
                  <span className="eq-fl">MTTR</span>
                  <span className="eq-fv">{summary.mttrHrs} hrs</span>
                </div>
              </div>

              <div className="eq-panel">
                <div className="eq-ch">
                  <div className="eq-ct">Upcoming maintenance</div>
                </div>
                {scheduledTasks.slice(0, 4).map((task: any) => (
                  <div key={task.id} className="eq-timeline-row">
                    <div
                      className="eq-tl-dot"
                      style={{
                        background: task.status === 'inprogress' ? '#185FA5' : task.status === 'upcoming' ? '#854F0B' : '#5F5E5A'
                      }}
                    ></div>
                    <span style={{ flex: 1 }}>{task.testerId} · {task.fab}</span>
                    <span style={{ fontSize: 10, color: 'var(--tx-secondary)' }}>
                      {task.status === 'inprogress' ? 'Today' : task.scheduledAt.includes('25') ? '+2 days' : '+5 days'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: TESTER HEALTH */}
        <div className={`eq-tc ${activeTab === 'th' ? 'on' : ''}`}>
          <div className="eq-krow4">
            <div className="eq-kpi">
              <div className="eq-kl">Avg health score</div>
              <div className="eq-kv" style={{ color: '#3B6D11' }}>{summary.avgHealth}%</div>
              <div className="eq-kd">Across online testers</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Critical alerts</div>
              <div className="eq-kv" style={{ color: '#A32D2D' }}>{alertsSummary.critical}</div>
              <div className="eq-kd">ATE-07 thermal fault</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">MTBF</div>
              <div className="eq-kv">{summary.mtbfHrs} hrs</div>
              <div className="eq-kd">Mean time between faults</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">MTTR</div>
              <div className="eq-kv">{summary.mttrHrs} hrs</div>
              <div className="eq-kd">Mean time to repair</div>
            </div>
          </div>

          <div className="eq-panel">
            <div className="eq-ch">
              <div>
                <div className="eq-ct">Tester health detail</div>
                <div className="eq-cs">All diagnostic metrics per tester</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="eq-tbl w-full text-left">
                <thead>
                  <tr>
                    <th style={{ width: '10%' }}>Tester ID</th>
                    <th style={{ width: '8%' }}>Fab</th>
                    <th style={{ width: '10%' }}>Model</th>
                    <th style={{ width: '9%' }}>Health</th>
                    <th style={{ width: '10%' }}>Temp(°C)</th>
                    <th style={{ width: '10%' }}>Power(W)</th>
                    <th style={{ width: '9%' }}>Uptime</th>
                    <th style={{ width: '10%' }}>Last fault</th>
                    <th style={{ width: '10%' }}>Calib. due</th>
                    <th style={{ width: '14%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTesters.map((t: any) => (
                    <tr key={t.id}>
                      <td className="eq-font-mono" style={{ fontWeight: 600 }}>{t.id}</td>
                      <td>{t.fab}</td>
                      <td>{t.model}</td>
                      <td style={{ color: t.healthScore === null ? 'var(--tx-secondary)' : t.healthScore > 90 ? '#3B6D11' : '#854F0B', fontWeight: 600 }}>
                        {t.healthScore !== null ? `${t.healthScore}%` : t.status === 'fault' ? '!' : '—'}
                      </td>
                      <td>{t.temperature !== null ? `${t.temperature}°C` : '—'}</td>
                      <td>{t.powerW !== null ? `${t.powerW.toLocaleString()}W` : '—'}</td>
                      <td>{t.uptimePct !== null ? `${t.uptimePct}%` : '—'}</td>
                      <td>{t.id === 'ATE-07' ? '2 hrs ago' : t.id === 'ATE-03' ? '2 days ago' : '14 days ago'}</td>
                      <td>{t.id === 'ATE-07' ? 'Overdue' : t.id === 'ATE-03' ? '+3 days' : '+28 days'}</td>
                      <td>
                        <span className={getStatusBadgeClass(t.status)}>
                          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="eq-g2">
            <div className="eq-panel" style={{ background: '#FCEBEB', borderColor: '#F09595' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A32D2D', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                [!] ATE-07 FAULT DETAIL
              </div>
              <div className="eq-fr" style={{ borderColor: '#F09595' }}>
                <span className="eq-fl">Fault code</span>
                <span className="eq-fv eq-font-mono" style={{ fontSize: 10, color: '#A32D2D' }}>THERM_CAL_FAIL_0x4F</span>
              </div>
              <div className="eq-fr" style={{ borderColor: '#F09595' }}>
                <span className="eq-fl">Temp at fault</span>
                <span className="eq-fv" style={{ color: '#A32D2D' }}>91°C (limit: 75°C)</span>
              </div>
              <div className="eq-fr" style={{ borderColor: '#F09595' }}>
                <span className="eq-fl">Time detected</span>
                <span className="eq-fv" style={{ color: '#712B13' }}>2h ago</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="eq-bp" onClick={() => sendPrompt('What is the root cause and fix for ATE-07 thermal calibration failure THERM_CAL_FAIL_0x4F?')}>
                  Investigate ↗
                </button>
                <button className="eq-bs" style={{ background: 'white', borderColor: '#F09595', color: '#A32D2D' }} onClick={() => sendPrompt('Schedule emergency maintenance for ATE-07 in Fab C')}>
                  Schedule repair ↗
                </button>
              </div>
            </div>

            <div className="eq-panel" style={{ background: '#FAEEDA', borderColor: '#FAC775' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#854F0B', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                [!] ATE-03 WARNING DETAIL
              </div>
              <div className="eq-fr" style={{ borderColor: '#FAC775' }}>
                <span className="eq-fl">Temperature</span>
                <span className="eq-fv" style={{ color: '#854F0B' }}>61°C (warn: 55°C)</span>
              </div>
              <div className="eq-fr" style={{ borderColor: '#FAC775' }}>
                <span className="eq-fl">Calibration due</span>
                <span className="eq-fv" style={{ color: '#854F0B' }}>+3 days</span>
              </div>
              <div className="eq-fr" style={{ borderColor: '#FAC775' }}>
                <span className="eq-fl">Health trend</span>
                <span className="eq-fv" style={{ color: '#854F0B' }}>Declining (–4%/week)</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <button className="eq-bs" style={{ background: 'white', borderColor: '#FAC775', color: '#854F0B' }} onClick={() => sendPrompt('Schedule preventive maintenance for ATE-03 in Fab A before it faults')}>
                  Schedule preventive ↗
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 3: UTILISATION */}
        <div className={`eq-tc ${activeTab === 'ut' ? 'on' : ''}`}>
          <div className="eq-krow4">
            <div className="eq-kpi">
              <div className="eq-kl">Fleet avg utilisation</div>
              <div className="eq-kv" style={{ color: '#534AB7' }}>{summary.avgUtil}%</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Peak utilisation</div>
              <div className="eq-kv" style={{ fontSize: 14 }}>ATE-04</div>
              <div className="eq-kd">88% · Fab B</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Idle time (total)</div>
              <div className="eq-kv">{idleBreakdown.totalHrs} hrs</div>
              <div className="eq-kd">This week</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Lots processed</div>
              <div className="eq-kv">1,842</div>
              <div className="eq-kd">Last 7 days</div>
            </div>
          </div>

          <div className="eq-panel">
            <div className="eq-ch">
              <div className="eq-ct">Utilisation by tester — last 7 days</div>
              <div className="eq-cs">Target: 80%</div>
            </div>
            {testers.slice(0, 7).map((t: any) => (
              <div key={t.id} className="eq-mb">
                <div style={{ width: 64, fontWeight: 500 }}>{t.id}</div>
                <div className="eq-pw">
                  <div
                    className="eq-pb"
                    style={{
                      width: `${t.utilisation7d}%`,
                      background: t.status === 'fault' ? '#E24B4A' : t.status === 'maintenance' ? '#185FA5' : t.utilisation7d > 80 ? '#1D9E75' : '#534AB7'
                    }}
                  ></div>
                </div>
                <div style={{ width: 30, textAlign: 'right' }}>{t.utilisation7d}%</div>
                <div
                  className={t.status === 'fault' ? 'eq-badge eq-bgr' : t.status === 'maintenance' ? 'eq-badge eq-bgb' : t.utilisation7d >= 80 ? 'eq-badge eq-bgg' : 'eq-badge eq-bga'}
                  style={{ marginLeft: 6, width: 85, textAlign: 'center' }}
                >
                  {t.status === 'fault' ? 'Fault / offline' : t.status === 'maintenance' ? 'Maintenance' : t.utilisation7d >= 80 ? 'Above target' : 'Below target'}
                </div>
              </div>
            ))}
          </div>

          <div className="eq-g2">
            <div className="eq-panel">
              <div className="eq-ch">
                <div className="eq-ct">Utilisation by fab</div>
              </div>
              {utilisationData?.byFab.map((f: any) => (
                <div key={f.fab} className="eq-fr">
                  <span className="eq-fl">{f.fab}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="eq-pw" style={{ width: 90, flex: 'none' }}>
                      <div className="eq-pb" style={{ width: `${f.avgPct}%`, background: f.fab === 'Fab B' ? '#0F6E56' : f.fab === 'Fab C' ? '#BA7517' : '#534AB7' }}></div>
                    </div>
                    <span className="eq-fv" style={{ width: 30, textAlign: 'right', color: f.avgPct > 80 ? '#3B6D11' : f.avgPct < 70 ? '#A32D2D' : 'var(--tx-primary)' }}>
                      {f.avgPct}%
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 10, color: 'var(--tx-secondary)' }}>
                Fab C below target — ATE-07 offline is primary driver
              </div>
            </div>

            <div className="eq-panel">
              <div className="eq-ch">
                <div className="eq-ct">Idle time breakdown</div>
              </div>
              <div className="eq-fr">
                <span className="eq-fl">Planned maintenance</span>
                <span className="eq-fv">{idleBreakdown.plannedMaintenance} hrs</span>
              </div>
              <div className="eq-fr">
                <span className="eq-fl">Unplanned fault</span>
                <span className="eq-fv" style={{ color: '#A32D2D' }}>{idleBreakdown.unplannedFault} hrs</span>
              </div>
              <div className="eq-fr">
                <span className="eq-fl">Queue wait</span>
                <span className="eq-fv">{idleBreakdown.queueWait} hrs</span>
              </div>
              <div className="eq-fr">
                <span className="eq-fl">Calibration</span>
                <span className="eq-fv">{idleBreakdown.calibration} hrs</span>
              </div>
              <div className="eq-fr">
                <span className="eq-fl" style={{ fontWeight: 600 }}>Total idle</span>
                <span className="eq-fv" style={{ fontWeight: 600 }}>{idleBreakdown.totalHrs} hrs</span>
              </div>
              <button className="eq-bp" style={{ width: '100%', marginTop: 10 }} onClick={() => sendPrompt('How can I reduce the 42 hours of unplanned fault idle time across the tester fleet?')}>
                Optimise idle time ↗
              </button>
            </div>
          </div>
        </div>

        {/* TAB 4: MAINTENANCE */}
        <div className={`eq-tc ${activeTab === 'mt' ? 'on' : ''}`}>
          <div className="eq-krow4">
            <div className="eq-kpi">
              <div className="eq-kl">Due this week</div>
              <div className="eq-kv" style={{ color: '#854F0B' }}>2</div>
              <div className="eq-kd">ATE-05, ATE-09</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Overdue</div>
              <div className="eq-kv" style={{ color: '#A32D2D' }}>1</div>
              <div className="eq-kd">ATE-07 calibration</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Completed (month)</div>
              <div className="eq-kv" style={{ color: '#3B6D11' }}>6</div>
              <div className="eq-kd">On schedule</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Next scheduled</div>
              <div className="eq-kv" style={{ fontSize: 13 }}>ATE-05</div>
              <div className="eq-kd">Today · Fab B</div>
            </div>
          </div>

          <div className="eq-panel">
            <div className="eq-ch flex justify-between items-center flex-wrap gap-4">
              <div>
                <div className="eq-ct">Maintenance schedule</div>
                <div className="eq-cs">All upcoming and recent tasks</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select className="eq-sel" value={selectedTaskType} onChange={e => setSelectedTaskType(e.target.value)}>
                  <option>All types</option>
                  <option>Preventive</option>
                  <option>Calibration</option>
                  <option>Corrective</option>
                </select>
                <button className="eq-bp" style={{ fontSize: 10 }} onClick={() => sendPrompt('Schedule a new maintenance task for a tester in the Equipment module')}>
                  Schedule task
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="eq-tbl w-full text-left">
                <thead>
                  <tr>
                    <th style={{ width: '11%' }}>Tester</th>
                    <th style={{ width: '8%' }}>Fab</th>
                    <th style={{ width: '14%' }}>Task type</th>
                    <th style={{ width: '18%' }}>Description</th>
                    <th style={{ width: '11%' }}>Scheduled</th>
                    <th style={{ width: '11%' }}>Duration</th>
                    <th style={{ width: '11%' }}>Engineer</th>
                    <th style={{ width: '16%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledTasks.filter((t: any) => selectedTaskType === 'All types' || t.taskType === selectedTaskType).map((task: any) => (
                    <tr key={task.id}>
                      <td className="eq-font-mono" style={{ fontWeight: 600 }}>{task.testerId}</td>
                      <td>{task.fab}</td>
                      <td>{task.taskType}</td>
                      <td>{task.description}</td>
                      <td>{task.scheduledAt.includes('23') ? (task.testerId === 'ATE-07' ? 'ASAP' : 'Today') : task.scheduledAt.includes('25') ? '+2 days' : '+5 days'}</td>
                      <td>{task.estimatedHours}h</td>
                      <td>{task.engineerName}</td>
                      <td>
                        <span className={task.status === 'inprogress' ? 'eq-badge eq-bgb' : task.status === 'upcoming' ? 'eq-badge eq-bga' : task.testerId === 'ATE-07' ? 'eq-badge eq-bgr' : 'eq-badge eq-bggy'}>
                          {task.testerId === 'ATE-07' ? 'Overdue / fault' : task.status === 'inprogress' ? 'In progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="eq-panel">
            <div className="eq-ch">
              <div className="eq-ct">Maintenance history — last 30 days</div>
            </div>
            <div className="overflow-x-auto">
              <table className="eq-tbl w-full text-left">
                <thead>
                  <tr>
                    <th style={{ width: '11%' }}>Tester</th>
                    <th style={{ width: '8%' }}>Fab</th>
                    <th style={{ width: '14%' }}>Task</th>
                    <th style={{ width: '11%' }}>Date</th>
                    <th style={{ width: '11%' }}>Duration</th>
                    <th style={{ width: '12%' }}>Downtime</th>
                    <th style={{ width: '12%' }}>Engineer</th>
                    <th style={{ width: '21%' }}>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {historyTasks.map((hist: any) => (
                    <tr key={hist.id}>
                      <td className="eq-font-mono" style={{ fontWeight: 600 }}>{hist.testerId}</td>
                      <td>{hist.fab}</td>
                      <td>{hist.taskType}</td>
                      <td>May {hist.testerId === 'ATE-01' ? '18' : hist.testerId === 'ATE-06' ? '12' : hist.testerId === 'ATE-08' ? '08' : '02'}</td>
                      <td>{hist.actualHours}h</td>
                      <td>{hist.downtime} hrs</td>
                      <td>{hist.engineerName}</td>
                      <td>
                        <span className={hist.outcome.includes('Fixed') || hist.outcome.includes('Passed') || hist.outcome.includes('no issues') ? 'eq-badge eq-bgg' : 'eq-badge eq-bga'}>
                          {hist.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* TAB 5: ALERTS */}
        <div className={`eq-tc ${activeTab === 'al' ? 'on' : ''}`}>
          <div className="eq-krow4">
            <div className="eq-kpi">
              <div className="eq-kl">Critical</div>
              <div className="eq-kv" style={{ color: '#A32D2D' }}>{alertsSummary.critical}</div>
              <div className="eq-kd">ATE-07 thermal fault</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Warning</div>
              <div className="eq-kv" style={{ color: '#854F0B' }}>{alertsSummary.warning}</div>
              <div className="eq-kd">ATE-03 · calib overdue</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Info</div>
              <div className="eq-kv" style={{ color: '#185FA5' }}>{alertsSummary.info}</div>
              <div className="eq-kd">Maintenance reminders</div>
            </div>
            <div className="eq-kpi">
              <div className="eq-kl">Resolved today</div>
              <div className="eq-kv" style={{ color: '#3B6D11' }}>{alertsSummary.resolvedToday}</div>
              <div className="eq-kd">Auto-cleared</div>
            </div>
          </div>

          <div className="eq-panel">
            <div className="eq-ch flex justify-between items-center flex-wrap gap-4">
              <div className="eq-ct">Active alerts</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select className="eq-sel" value={selectedAlertSeverity} onChange={e => setSelectedAlertSeverity(e.target.value)}>
                  <option>All severities</option>
                  <option>Critical</option>
                  <option>Warning</option>
                  <option>Info</option>
                </select>
                <button className="eq-bs" style={{ fontSize: 10 }} onClick={() => sendPrompt('Mark all alerts as read')}>
                  Mark all read
                </button>
              </div>
            </div>

            {activeAlerts
              .filter((a: any) => selectedAlertSeverity === 'All severities' || a.severity === selectedAlertSeverity.toLowerCase())
              .map((alert: any) => (
                <div
                  key={alert.id}
                  className="eq-alert-row"
                  style={{
                    background: alert.severity === 'critical' ? '#FCEBEB' : alert.severity === 'warning' ? '#FAEEDA' : 'var(--bg-secondary)',
                    borderColor: alert.severity === 'critical' ? '#F09595' : alert.severity === 'warning' ? '#FAC775' : 'var(--border)'
                  }}
                >
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border mr-1 self-start select-none" style={{
                    color: alert.severity === 'critical' ? '#A32D2D' : alert.severity === 'warning' ? '#854F0B' : '#185FA5',
                    borderColor: alert.severity === 'critical' ? '#F09595' : alert.severity === 'warning' ? '#FAC775' : 'var(--border)',
                    background: 'rgba(255,255,255,0.05)'
                  }}>
                    {alert.severity === 'critical' ? 'CRIT' : alert.severity === 'warning' ? 'WARN' : 'INFO'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: alert.severity === 'critical' ? '#A32D2D' : alert.severity === 'warning' ? '#854F0B' : 'var(--tx-primary)'
                      }}
                    >
                      {alert.testerId} · {alert.fab} — {alert.severity.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx-secondary)', marginTop: 2 }}>{alert.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx-tertiary)', marginTop: 4 }}>
                      {alert.severity === 'critical' ? '2 hours ago' : alert.severity === 'warning' ? '6 hours ago' : '1 day ago'}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap shrink-0 items-center justify-end">
                    {alert.severity === 'critical' && (
                      <button className="eq-bp" style={{ fontSize: 10 }} onClick={() => sendPrompt(`Investigate ${alert.testerId} thermal calibration failure and give me a repair checklist`)}>
                        Investigate ↗
                      </button>
                    )}
                    {alert.severity === 'warning' && alert.testerId === 'ATE-03' && (
                      <button className="eq-bs" style={{ fontSize: 10, borderColor: '#FAC775', background: 'white', color: '#854F0B' }} onClick={() => sendPrompt('Schedule preventive maintenance for ATE-03 Fab A due to high temperature warning')}>
                        Schedule ↗
                      </button>
                    )}
                    <button className="eq-bs" style={{ fontSize: 10 }} onClick={() => handleAcknowledgeAlert(alert.id)}>
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}
