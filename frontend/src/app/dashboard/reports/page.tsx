"use client";

import { useState, useEffect } from 'react';
// No icons imported
import { sendPrompt } from '@/lib/sendPrompt';

const Slack = (props: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={props.size ?? 16}
    height={props.size ?? 16}
    fill="currentColor"
    {...props}
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.824 5.043a2.528 2.528 0 0 1-2.52-2.522A2.528 2.528 0 0 1 8.824 0a2.528 2.528 0 0 1 2.522 2.522v2.521h-2.522zm0 1.261a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H3.782a2.528 2.528 0 0 1-2.522-2.52V8.824a2.528 2.528 0 0 1 2.522-2.52h5.042zm10.134 3.761a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.522h-2.52v-2.522zm-1.262 0a2.528 2.528 0 0 1-2.52 2.522H10.13a2.528 2.528 0 0 1-2.522-2.522V3.782a2.528 2.528 0 0 1 2.522-2.522h5.043a2.528 2.528 0 0 1 2.52 2.522v5.043zM15.176 18.957a2.528 2.528 0 0 1 2.52 2.522 2.528 2.528 0 0 1-2.52 2.52 2.528 2.528 0 0 1-2.522-2.52v-2.522h2.522zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z" />
  </svg>
);

export default function ReportsPage() {
  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<'lib' | 'sch' | 'bl' | 'hist'>('lib');
  const [selectedFab, setSelectedFab] = useState('All fabs');
  const [selectedTimeline, setSelectedTimeline] = useState('May 18 – now');
  const [libraryModule, setLibraryModule] = useState('All');
  const [libraryFormat, setLibraryFormat] = useState('All');
  const [librarySearch, setLibrarySearch] = useState('');

  // History filtering
  const [historyTrigger, setHistoryTrigger] = useState('All');
  const [historyStatus, setHistoryStatus] = useState('All');

  // Blueprint Explorer Toggle
  const [showBlueprint, setShowBlueprint] = useState(false);

  // Floating Toast Notification
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  // Custom Builder State
  const [builderName, setBuilderName] = useState('Weekly Fab A executive summary');
  const [builderFormat, setBuilderFormat] = useState<'PDF' | 'CSV' | 'Excel'>('PDF');
  const [builderDates, setBuilderDates] = useState('Last 7 days');
  const [builderFab, setBuilderFab] = useState('Fab A');
  const [builderSections, setBuilderSections] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: false,
    5: true,
    6: false,
    7: false,
    8: false,
    9: false
  });
  const [builderRecipients, setBuilderRecipients] = useState('eng@company.com, cto@company.com');
  const [builderSlack, setBuilderSlack] = useState('#ate-reports');
  const [builderSftp, setBuilderSftp] = useState('/reports/ate/');
  const [builderIsSchedule, setBuilderIsSchedule] = useState(false);

  // Dynamic Size Calculations
  const [estSectionsCount, setEstSectionsCount] = useState('5 of 10');
  const [estPagesCount, setEstPagesCount] = useState('~16 pages');
  const [estFileSize, setEstFileSize] = useState('~2.3 MB');
  const [estGenTime, setEstGenTime] = useState('~11 seconds');

  // Asynchronous Loader Progress Modal
  const [loader, setLoader] = useState<{
    active: boolean;
    title: string;
    desc: string;
    progress: number;
  }>({
    active: false,
    title: '',
    desc: '',
    progress: 0
  });

  // Templates Static Pool
  const templates = [
    { id: "rpt-exec", name: "Executive summary", desc: "Cost · yield · coverage", tags: ["pdf", "excel", "scheduled"], bg: "rgba(139,92,246,0.12)", color: "var(--accent-purple, #8B5CF6)", module: "wafer" },
    { id: "rpt-fail", name: "Pattern fail analysis", desc: "Fail rate · domain · cost", tags: ["pdf", "csv"], bg: "rgba(239,68,68,0.12)", color: "var(--accent-red, #EF4444)", module: "pattern-analysis" },
    { id: "rpt-coverage", name: "Coverage report", desc: "Stuck-at · transition · IDDQ", tags: ["pdf", "csv", "scheduled"], bg: "rgba(16,185,129,0.12)", color: "var(--accent-teal, #10B981)", module: "pattern-analysis" },
    { id: "rpt-cost", name: "Cost intelligence", desc: "Cost/die · ROI · fab compare", tags: ["pdf", "excel", "scheduled"], bg: "rgba(245,158,11,0.12)", color: "var(--accent-amber, #F59E0B)", module: "cost" },
    { id: "rpt-equip", name: "Equipment health", desc: "MTBF · utilisation · alerts", tags: ["pdf", "csv"], bg: "rgba(255,255,255,0.06)", color: "var(--tx-muted, #4A5A70)", module: "equipment" },
    { id: "rpt-roi", name: "Test optimization ROI", desc: "Savings · applied · pending", tags: ["pdf", "excel"], bg: "rgba(139,92,246,0.12)", color: "var(--accent-purple, #8B5CF6)", module: "cost" }
  ];

  // Schedule Active Lists state
  const [schedules] = useState([
    { id: "s-1", name: "Executive summary", format: "pdf", freq: "Weekly", next: "Tonight 00:00", count: "5 users", chan: "Email", last: "May 18 · ok", status: "active" },
    { id: "s-2", name: "Coverage report", format: "csv", freq: "Daily", next: "Today 23:00", count: "3 users", chan: "Email", last: "May 24 · ok", status: "active" },
    { id: "s-3", name: "Cost intelligence", format: "excel", freq: "Monthly", next: "Jun 1 00:00", count: "4 users", chan: "Email", last: "May 1 · fail", status: "error" },
    { id: "s-4", name: "Pattern fail analysis", format: "pdf", freq: "Weekly", next: "Mon 08:00", count: "2 users", chan: "Slack", last: "May 18 · ok", status: "active" },
    { id: "s-5", name: "Equipment health", format: "pdf", freq: "Daily", next: "Today 07:00", count: "3 users", chan: "Email", last: "May 24 · ok", status: "active" },
    { id: "s-6", name: "Test optimization ROI", format: "excel", freq: "Weekly", next: "Mon 09:00", count: "4 users", chan: "Email", last: "May 18 · ok", status: "paused" }
  ]);

  // Run History Lists state
  const [historyRuns, setHistoryRuns] = useState([
    { id: "h-1", name: "Executive summary", format: "pdf", trigger: "Scheduled", time: "May 25 · 00:01", duration: "11s", size: "2.1 MB", dest: "5 users", status: "success" },
    { id: "h-2", name: "Coverage report", format: "csv", trigger: "Scheduled", time: "May 24 · 23:00", duration: "4s", size: "480 KB", dest: "3 users", status: "success" },
    { id: "h-3", name: "Pattern fail analysis", format: "pdf", trigger: "On-demand", time: "May 24 · 14:22", duration: "9s", size: "1.8 MB", dest: "SG", status: "success" },
    { id: "h-4", name: "Cost intelligence", format: "excel", trigger: "Scheduled", time: "May 1 · 00:01", duration: "—", size: "—", dest: "4 users", status: "failed" },
    { id: "h-5", name: "Equipment health", format: "pdf", trigger: "Scheduled", time: "May 24 · 07:00", duration: "7s", size: "940 KB", dest: "3 users", status: "success" },
    { id: "h-6", name: "Custom — Fab A weekly", format: "pdf", trigger: "On-demand", time: "May 23 · 09:14", duration: "14s", size: "3.1 MB", dest: "SG", status: "success" }
  ]);

  // Trigger floating toast helper
  const triggerToast = (title: string, message: string) => {
    setToast({ show: true, title, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Pre-fill Custom Builder fields
  const fillBuilderTemplate = (name: string) => {
    setBuilderName(`Weekly ${name} executive report`);
    const newSections = { ...builderSections };
    for (let i = 0; i < 10; i++) newSections[i] = false;

    if (name.includes('summary') || name.includes('Executive')) {
      newSections[0] = true;
      newSections[1] = true;
      newSections[2] = true;
      newSections[3] = true;
      newSections[5] = true;
    } else if (name.includes('Fail') || name.includes('Pattern')) {
      newSections[1] = true;
      newSections[9] = true;
    } else if (name.includes('Coverage')) {
      newSections[2] = true;
      newSections[7] = true;
    } else if (name.includes('Cost')) {
      newSections[3] = true;
      newSections[4] = true;
      newSections[5] = true;
    } else if (name.includes('Equipment')) {
      newSections[6] = true;
    } else {
      newSections[0] = true;
      newSections[5] = true;
    }
    setBuilderSections(newSections);
    setActiveTab('bl');
    triggerToast("Template Loaded", `Custom Builder preset to "${name}" structure.`);
  };

  // Re-calculate Custom Builder dynamic sizing
  const handleCheckboxChange = (index: number) => {
    setBuilderSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    let checkedCount = 0;
    Object.keys(builderSections).forEach(k => {
      if (builderSections[parseInt(k)]) checkedCount++;
    });

    setEstSectionsCount(`${checkedCount} of 10`);

    if (builderFormat === 'PDF') {
      const pages = Math.round(checkedCount * 3.2);
      setEstPagesCount(`~${pages} pages`);
      setEstFileSize(`~${(checkedCount * 0.45).toFixed(1)} MB`);
      setEstGenTime(`~${Math.round(checkedCount * 2.2)} seconds`);
    } else if (builderFormat === 'CSV') {
      setEstPagesCount('—');
      setEstFileSize(`~${Math.round(checkedCount * 85)} KB`);
      setEstGenTime(`~${Math.round(checkedCount * 0.9)} seconds`);
    } else {
      setEstPagesCount(`~${checkedCount} worksheets`);
      setEstFileSize(`~${Math.round(checkedCount * 140)} KB`);
      setEstGenTime(`~${Math.round(checkedCount * 1.5)} seconds`);
    }
  }, [builderSections, builderFormat]);

  // Async Multi-Stage generation simulation
  const launchAsyncGeneration = (reportName: string, format: string, promptText: string) => {
    setLoader({
      active: true,
      title: `Compiling: ${reportName}`,
      desc: "Stage 1: Connecting databases and parsing ATE logs...",
      progress: 0
    });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setLoader(prev => {
        let desc = prev.desc;
        if (currentProgress === 30) {
          desc = "Stage 2: Formatting output pages and compiling graphs...";
        } else if (currentProgress === 70) {
          desc = "Stage 3: Exporting file stream and dispatching email channels...";
        }
        return {
          ...prev,
          progress: currentProgress,
          desc
        };
      });

      if (currentProgress >= 100) {
        clearInterval(interval);
        setLoader(prev => ({ ...prev, active: false }));

        // Add new successful run item to list
        const newRun = {
          id: `h_${Date.now().toString().substring(8)}`,
          name: reportName,
          format: format,
          trigger: "On-demand",
          time: "Just now",
          duration: `${Math.round(2 + Math.random() * 6)}s`,
          size: `${(1 + Math.random() * 3).toFixed(1)} MB`,
          dest: "SG",
          status: "success"
        };
        setHistoryRuns(prev => [newRun, ...prev]);

        triggerToast("Report Completed", `Successfully exported ${reportName} (${format.toUpperCase()}).`);
        sendPrompt(promptText);
      }
    }, 300);
  };

  // Trigger retry for failed runs
  const handleRetryRun = (runId: string, name: string) => {
    triggerToast("Retrying Job", `Re-triggering failed run config for: ${name}`);
    sendPrompt(`Re-run the failed Cost Intelligence Excel scheduled report from May 1`);

    setTimeout(() => {
      setHistoryRuns(prev => prev.map(h => {
        if (h.id === runId) {
          return {
            ...h,
            status: 'success',
            duration: '15s',
            size: '1.2 MB',
            time: 'Just now'
          };
        }
        return h;
      }));
      triggerToast("Job Recovered", `Successfully delivered ${name} report payload via email.`);
    }, 1500);
  };

  // Filter templates list
  const filteredTemplates = templates.filter(t => {
    if (libraryModule !== 'All' && t.module !== libraryModule) return false;
    if (libraryFormat !== 'All' && !t.tags.includes(libraryFormat.toLowerCase())) return false;
    if (librarySearch.trim() !== '') {
      const q = librarySearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
    }
    return true;
  });

  // Filter history runs list
  const filteredHistory = historyRuns.filter(h => {
    if (historyTrigger !== 'All' && h.trigger !== historyTrigger) return false;
    if (historyStatus !== 'All' && h.status !== historyStatus) return false;
    return true;
  });

  // KPI aggregates
  const totalReportsCount = templates.length;
  const activeSchedulesCount = schedules.filter(s => s.status === 'active').length;
  const failedSchedulesCount = schedules.filter(s => s.status === 'error').length;
  const totalHistoryCount = historyRuns.length;
  const successHistoryCount = historyRuns.filter(h => h.status === 'success').length;
  const failedHistoryCount = historyRuns.filter(h => h.status === 'failed').length;

  return (
    <div className="rep-container animate-fade-in pb-12">
      {/* TOPBAR */}
      <div className="rep-topbar">
        <div style={{ paddingLeft: '4px', borderLeft: '3px solid', borderImage: 'linear-gradient(to bottom, var(--accent-purple), transparent) 1' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-[18px] font-bold" style={{ color: 'var(--tx-primary)', letterSpacing: '-0.02em' }}>
              Reports
            </h1>
          </div>
          <p className="rep-tsub">Scheduled, on-demand, and automated executive-level PDF/CSV report generation</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <select className="rep-sel" value={selectedFab} onChange={e => {
            setSelectedFab(e.target.value);
            triggerToast('Fab Changed', 'Filter applied to Library templates.');
          }}>
            <option>All fabs</option>
            <option>Fab A</option>
            <option>Fab B</option>
            <option>Fab C</option>
          </select>

          <select className="rep-sel" value={selectedTimeline} onChange={e => {
            setSelectedTimeline(e.target.value);
            triggerToast('Timeline Shifted', 'Generating window adjusted.');
          }}>
            <option>May 18 – now</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Custom range</option>
          </select>

          <button className="rep-bp" onClick={() => fillBuilderTemplate('Executive summary')}>
            New report
          </button>
        </div>
      </div>

      {/* PILL TABS */}
      <div
        className="flex items-center gap-1 p-1 overflow-x-auto scrollbar-thin mt-4 mb-4"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {[
          { id: 'lib', label: 'Report Library' },
          { id: 'sch', label: 'Scheduler' },
          { id: 'bl', label: 'Custom Builder' },
          { id: 'hist', label: 'Run History' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-[12px] font-bold uppercase tracking-wider transition-all duration-150 whitespace-nowrap shrink-0 relative"
            style={activeTab === tab.id
              ? { background: 'var(--accent-purple)', color: '#fff', boxShadow: '0 0 12px rgba(139,92,246,0.25)' }
              : { color: 'var(--tx-secondary)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* BODY CONTENT */}
      <div className="rep-body">

        {/* TAB 1: REPORT LIBRARY */}
        <div className={`rep-tc ${activeTab === 'lib' ? 'on' : ''}`}>
          <div className="rep-krow">
            <div className="rep-kpi">
              <div className="rep-kl">Total templates</div>
              <div className="rep-kv">{totalReportsCount}</div>
              <div className="rep-kd">Across all modules</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Generated this month</div>
              <div className="rep-kv" style={{ color: 'var(--accent-purple)' }}>148</div>
              <div className="rep-kd">PDF + CSV combined</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Scheduled active</div>
              <div className="rep-kv" style={{ color: 'var(--accent-teal)' }}>{activeSchedulesCount}</div>
              <div className="rep-kd">Auto-running</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Last generated</div>
              <div className="rep-kv" style={{ fontSize: '13px' }}>2 min ago</div>
              <div className="rep-kd">Exec summary · PDF</div>
            </div>
          </div>

          <div className="rep-card">
            <div className="rep-ch">
              <div>
                <h3 className="rep-ct">All report templates</h3>
                <p className="rep-cs">Click to generate, preview, or schedule</p>
              </div>

              <div className="flex items-center gap-2">
                <select className="rep-sel" value={libraryModule} onChange={e => setLibraryModule(e.target.value)}>
                  <option value="All">All modules</option>
                  <option value="pattern-analysis">Pattern analysis</option>
                  <option value="cost">Cost intelligence</option>
                  <option value="equipment">Equipment</option>
                  <option value="wafer">Wafer analytics</option>
                </select>
                <select className="rep-sel" value={libraryFormat} onChange={e => setLibraryFormat(e.target.value)}>
                  <option value="All">All formats</option>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
            </div>

            <input
              type="text"
              className="rep-srch"
              placeholder="Search report templates..."
              value={librarySearch}
              onChange={e => setLibrarySearch(e.target.value)}
            />

            <div className="rep-g3">
              {filteredTemplates.map(t => {
                const isScheduled = t.tags.includes('scheduled');
                const isPdf = t.tags.includes('pdf');
                const isCsv = t.tags.includes('csv');
                const isExcel = t.tags.includes('excel');

                return (
                  <div key={t.id} className="rep-rcard pointer-events-auto cursor-pointer" onClick={() => sendPrompt(`Generate the ${t.name} report as PDF for current lot and fab selection`)}>
                    <div className="flex flex-col gap-1">
                      <div>
                        <div className="text-[12px] font-semibold text-[var(--tx-primary)]">{t.name}</div>
                        <div className="text-[10px] text-[var(--tx-secondary)]">{t.desc}</div>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-wrap mt-1">
                      {isPdf && <span className="rep-badge rep-bgp">PDF</span>}
                      {isCsv && <span className="rep-badge rep-bgt">CSV</span>}
                      {isExcel && <span className="rep-badge rep-bggy">EXCEL</span>}
                      {isScheduled && <span className="rep-badge rep-bgb">SCHEDULED</span>}
                    </div>

                    <div className="flex gap-1.5 mt-auto pt-2">
                      <button
                        className="rep-bp"
                        style={{ flex: 1, fontSize: '10px', padding: '4px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          launchAsyncGeneration(t.name, t.tags[0], `Generate ${t.name} PDF report now for current fab and date range`);
                        }}
                      >
                        Generate ↗
                      </button>
                      <button
                        className="rep-bs text-[9px] font-bold font-mono px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('sch');
                          triggerToast('Active Schedules', `Filtered to ${t.name} recurring plans.`);
                        }}
                      >
                        PLAN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* TAB 2: SCHEDULER */}
        <div className={`rep-tc ${activeTab === 'sch' ? 'on' : ''}`}>
          <div className="rep-krow">
            <div className="rep-kpi">
              <div className="rep-kl">Active schedules</div>
              <div className="rep-kv" style={{ color: 'var(--accent-teal)' }}>{activeSchedulesCount}</div>
              <div className="rep-kd">Weekly & monthly plans</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Next run</div>
              <div className="rep-kv rep-font-mono" style={{ fontSize: '13px', color: 'var(--accent-purple)' }}>Tonight 00:00</div>
              <div className="rep-kd">Exec summary · weekly</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Recipients</div>
              <div className="rep-kv rep-font-mono">14</div>
              <div className="rep-kd">Across all schedules</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Failed last run</div>
              <div className="rep-kv" style={{ color: 'var(--accent-red)' }}>{failedSchedulesCount}</div>
              <div className="rep-kd">Cost intel · email error</div>
            </div>
          </div>

          <div className="rep-card">
            <div className="rep-ch">
              <div>
                <h3 className="rep-ct">Active schedules</h3>
                <p className="rep-cs">Manage recurring report delivery</p>
              </div>
              <button className="rep-bp" style={{ fontSize: '10px' }} onClick={() => sendPrompt('Create a new scheduled report in the ATE Intelligence Reports module')}>
                Add schedule
              </button>
            </div>

            <div className="rep-table-scroll overflow-x-auto">
              <table className="rep-tbl w-full text-left">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Report</th>
                    <th style={{ width: '10%' }}>Format</th>
                    <th style={{ width: '11%' }}>Frequency</th>
                    <th style={{ width: '12%' }}>Next run</th>
                    <th style={{ width: '11%' }}>Recipients</th>
                    <th style={{ width: '10%' }}>Delivery</th>
                    <th style={{ width: '13%' }}>Last run</th>
                    <th style={{ width: '15%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(s => {
                    const isPdf = s.format === 'pdf';
                    const isCsv = s.format === 'csv';
                    const isError = s.status === 'error';
                    const isPaused = s.status === 'paused';

                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500, color: 'var(--accent-purple)' }}>{s.name}</td>
                        <td>
                          <span className={`rep-badge ${isPdf ? 'rep-bgp' : isCsv ? 'rep-bgt' : 'rep-bggy'}`}>
                            {s.format.toUpperCase()}
                          </span>
                        </td>
                        <td>{s.freq}</td>
                        <td className="rep-font-mono">{s.next}</td>
                        <td>{s.count}</td>
                        <td>{s.chan}</td>
                        <td className={isError ? 'text-[var(--accent-red)]' : ''}>{s.last}</td>
                        <td>
                          <span className={`rep-badge ${isError ? 'rep-bgr' : isPaused ? 'rep-bga' : 'rep-bgg'}`}>
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rep-g2">
            {/* SMTP error detailed helper */}
            <div className="rep-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'rgba(239,68,68,0.04)', borderBottom: '0.5px solid rgba(239,68,68,0.2)', padding: '8px 12px' }}>
                <h3 className="rep-ct" style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Schedule detail — cost intelligence error
                </h3>
              </div>

              <div style={{ padding: 12, background: 'rgba(239,68,68,0.06)' }}>
                <div style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-red)', fontSize: '11px', fontWeight: 600, marginBottom: 5 }}>
                    Email delivery failed · May 1
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div className="rep-fr" style={{ borderColor: 'var(--border)' }}>
                      <span className="rep-fl">Error</span>
                      <span className="rep-fv rep-font-mono" style={{ fontSize: 10, color: 'var(--accent-red)' }}>SMTP_AUTH_FAIL</span>
                    </div>
                    <div className="rep-fr" style={{ borderColor: 'var(--border)' }}>
                      <span className="rep-fl">Recipients</span>
                      <span className="rep-fv" style={{ color: 'var(--accent-amber)' }}>4 users — none delivered</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2 pt-1">
                    <button className="rep-bp" style={{ fontSize: 10 }} onClick={() => sendPrompt('Fix the SMTP delivery error on the Cost Intelligence monthly scheduled report')}>
                      Fix and retry ↗
                    </button>
                    <button className="rep-bs" style={{ fontSize: 10, borderColor: 'rgba(239,68,68,0.3)', color: 'var(--accent-red)' }} onClick={() => triggerToast('Editor Dispatched', 'Schedule properties active.')}>
                      Edit schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery channels */}
            <div className="rep-card">
              <div className="rep-ch">
                <h3 className="rep-ct">Delivery channels</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="rep-fr">
                  <span className="rep-fl flex items-center gap-1.5">Email</span>
                  <span className="rep-fv rep-font-mono">7 schedules</span>
                </div>
                <div className="rep-fr">
                  <span className="rep-fl flex items-center gap-1.5">Slack</span>
                  <span className="rep-fv rep-font-mono">1 schedule</span>
                </div>
                <div className="rep-fr">
                  <span className="rep-fl flex items-center gap-1.5">SFTP</span>
                  <span className="rep-fv rep-font-mono">1 schedule</span>
                </div>
                <div className="rep-fr">
                  <span className="rep-fl flex items-center gap-1.5">Webhook</span>
                  <span className="rep-fv rep-font-mono text-muted">0 schedules</span>
                </div>
              </div>

              <button className="rep-bs w-full mt-3" style={{ fontSize: 10 }} onClick={() => sendPrompt('Configure delivery channels for scheduled reports in ATE Intelligence — email, Slack, SFTP, and webhook options')}>
                Configure channels ↗
              </button>
            </div>
          </div>
        </div>

        {/* TAB 3: CUSTOM BUILDER */}
        <div className={`rep-tc ${activeTab === 'bl' ? 'on' : ''}`}>
          <div className="rep-g2">
            {/* Config panel */}
            <div className="rep-card" style={{ marginBottom: 0 }}>
              <div className="rep-ch flex justify-between items-center gap-2">
                <h3 className="rep-ct">Report configuration</h3>
                <span className="rep-chip rep-font-mono flex items-center gap-1">Custom compiler</span>
              </div>

              <div className="rep-form-row">
                <label className="rep-form-lbl">Report name</label>
                <input
                  type="text"
                  className="rep-form-inp"
                  value={builderName}
                  onChange={e => setBuilderName(e.target.value)}
                />
              </div>

              <div className="rep-section-lbl">Output format</div>
              <div className="rep-seg-row">
                {(['PDF', 'CSV', 'Excel'] as const).map(fmt => (
                  <div
                    key={fmt}
                    className={`rep-seg ${builderFormat === fmt ? 'on' : ''}`}
                    onClick={() => setBuilderFormat(fmt)}
                  >
                    {fmt}
                  </div>
                ))}
              </div>

              <div className="rep-form-row">
                <label className="rep-form-lbl">Date range</label>
                <select className="rep-form-inp" value={builderDates} onChange={e => setBuilderDates(e.target.value)}>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>Custom range</option>
                </select>
              </div>

              <div className="rep-form-row">
                <label className="rep-form-lbl">Fab filter</label>
                <select className="rep-form-inp" value={builderFab} onChange={e => setBuilderFab(e.target.value)}>
                  <option>All fabs</option>
                  <option value="Fab A">Fab A</option>
                  <option value="Fab B">Fab B</option>
                  <option value="Fab C">Fab C</option>
                </select>
              </div>

              <div className="rep-section-lbl">Sections to include</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {[
                  "Executive KPI summary",
                  "Pattern fail analysis table",
                  "Coverage by fault class",
                  "Cost breakdown (category+type)",
                  "Wafer heatmap (spatial AI)",
                  "Test optimization savings",
                  "Equipment health summary",
                  "MBIST / LBIST detail",
                  "Scan chain + redundancy",
                  "AI recommendations"
                ].map((sec, idx) => (
                  <label key={idx} className="rep-chk-row flex items-center gap-1.5 text-[11px] text-[var(--tx-secondary)] select-none">
                    <input
                      type="checkbox"
                      checked={builderSections[idx] || false}
                      onChange={() => handleCheckboxChange(idx)}
                    />
                    {sec}
                  </label>
                ))}
              </div>

              <div className="rep-section-lbl">Branding</div>
              <div className="rep-form-row">
                <label className="rep-form-lbl">Company logo URL</label>
                <input type="text" className="rep-form-inp" defaultValue="https://company.logo/favicon.png" />
              </div>
              <div className="rep-form-row" style={{ marginBottom: 0 }}>
                <label className="rep-form-lbl">Report footer text</label>
                <input type="text" className="rep-form-inp" defaultValue="Confidential · ATE Intelligence" />
              </div>
            </div>

            {/* Delivery settings & stats */}
            <div className="flex flex-col gap-3">
              <div className="rep-card" style={{ marginBottom: 0 }}>
                <div className="rep-ch">
                  <h3 className="rep-ct">Delivery settings</h3>
                </div>

                <div className="rep-section-lbl" style={{ marginTop: 0 }}>Generate now or schedule</div>
                <div className="rep-seg-row">
                  <div
                    className={`rep-seg ${!builderIsSchedule ? 'on' : ''}`}
                    onClick={() => {
                      setBuilderIsSchedule(false);
                      triggerToast("Instant Mode", "Report will trigger immediate asynchronous compilation.");
                    }}
                  >
                    Generate now
                  </div>
                  <div
                    className={`rep-seg ${builderIsSchedule ? 'on' : ''}`}
                    onClick={() => {
                      setBuilderIsSchedule(true);
                      triggerToast("Schedule Mode", "Delivery options prepped for Cron recurring triggers.");
                    }}
                  >
                    Schedule
                  </div>
                </div>

                <div className="rep-form-row">
                  <label className="rep-form-lbl">Email recipients</label>
                  <input
                    type="text"
                    className="rep-form-inp"
                    value={builderRecipients}
                    onChange={e => setBuilderRecipients(e.target.value)}
                  />
                </div>
                <div className="rep-form-row">
                  <label className="rep-form-lbl">Slack channel</label>
                  <input
                    type="text"
                    className="rep-form-inp"
                    value={builderSlack}
                    onChange={e => setBuilderSlack(e.target.value)}
                  />
                </div>
                <div className="rep-form-row" style={{ marginBottom: 0 }}>
                  <label className="rep-form-lbl">SFTP path</label>
                  <input
                    type="text"
                    className="rep-form-inp"
                    value={builderSftp}
                    onChange={e => setBuilderSftp(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 mt-4 pt-1">
                  <button
                    className="rep-bp flex-1"
                    onClick={() => launchAsyncGeneration(builderName, builderFormat.toLowerCase(), 'Generate this custom report now with the selected sections, format, and delivery settings')}
                  >
                    Generate report ↗
                  </button>
                  <button
                    className="rep-bs"
                    onClick={() => sendPrompt('Preview the custom report layout before generating it')}
                  >
                    Preview
                  </button>
                </div>
              </div>

              <div className="rep-card flex-1 font-sans text-xs" style={{ marginBottom: 0 }}>
                <div className="rep-ch">
                  <h3 className="rep-ct">Estimated report size</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }} className="text-xs">
                  <div className="rep-fr">
                    <span className="rep-fl">Sections selected</span>
                    <span className="rep-fv rep-font-mono">{estSectionsCount}</span>
                  </div>
                  {builderFormat !== 'CSV' && (
                    <div className="rep-fr">
                      <span className="rep-fl">{builderFormat === 'PDF' ? 'Estimated pages (PDF)' : 'Worksheets (Excel)'}</span>
                      <span className="rep-fv rep-font-mono">{estPagesCount}</span>
                    </div>
                  )}
                  <div className="rep-fr">
                    <span className="rep-fl">Estimated file size</span>
                    <span className="rep-fv rep-font-mono">{estFileSize}</span>
                  </div>
                  <div className="rep-fr">
                    <span className="rep-fl">Generation time</span>
                    <span className="rep-fv rep-font-mono">{estGenTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 4: RUN HISTORY */}
        <div className={`rep-tc ${activeTab === 'hist' ? 'on' : ''}`}>
          <div className="rep-krow">
            <div className="rep-kpi">
              <div className="rep-kl">Total runs</div>
              <div className="rep-kv">{totalHistoryCount}</div>
              <div className="rep-kd">This month</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Successful</div>
              <div className="rep-kv" style={{ color: 'var(--accent-teal)' }}>{successHistoryCount}</div>
              <div className="rep-kd">{((successHistoryCount / totalHistoryCount) * 100).toFixed(1)}% success rate</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Failed</div>
              <div className="rep-kv" style={{ color: 'var(--accent-red)' }}>{failedHistoryCount}</div>
              <div className="rep-kd">All email-related</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Total data exported</div>
              <div className="rep-kv rep-font-mono" style={{ color: 'var(--accent-purple)' }}>1.8 GB</div>
              <div className="rep-kd">PDF + CSV + Excel</div>
            </div>
          </div>

          <div className="rep-card">
            <div className="rep-ch">
              <div>
                <h3 className="rep-ct">Report run history</h3>
                <p className="rep-cs">All generated reports — download or re-run</p>
              </div>

              <div className="flex gap-2">
                <select className="rep-sel" value={historyTrigger} onChange={e => setHistoryTrigger(e.target.value)}>
                  <option value="All">All triggers</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="On-demand">On-demand</option>
                </select>
                <select className="rep-sel" value={historyStatus} onChange={e => setHistoryStatus(e.target.value)}>
                  <option value="All">All statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="rep-table-scroll overflow-x-auto">
              <table className="rep-tbl w-full text-left">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Report name</th>
                    <th style={{ width: '9%' }}>Format</th>
                    <th style={{ width: '10%' }}>Triggered</th>
                    <th style={{ width: '14%' }}>Generated at</th>
                    <th style={{ width: '9%' }}>Duration</th>
                    <th style={{ width: '9%' }}>Size</th>
                    <th style={{ width: '11%' }}>Delivered to</th>
                    <th style={{ width: '18%' }}>Status / action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(h => {
                    const isPdf = h.format === 'pdf';
                    const isCsv = h.format === 'csv';
                    const isSuccess = h.status === 'success';

                    return (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 500, color: 'var(--accent-purple)' }}>{h.name}</td>
                        <td>
                          <span className={`rep-badge ${isPdf ? 'rep-bgp' : isCsv ? 'rep-bgt' : 'rep-bggy'}`}>
                            {h.format.toUpperCase()}
                          </span>
                        </td>
                        <td>{h.trigger}</td>
                        <td className="rep-font-mono">{h.time}</td>
                        <td className="rep-font-mono">{h.duration}</td>
                        <td className="rep-font-mono">{h.size}</td>
                        <td>{h.dest}</td>
                        <td>
                          <span className={`rep-badge ${isSuccess ? 'rep-bgg' : 'rep-bgr'}`}>
                            {isSuccess ? 'Success' : 'Failed'}
                          </span>
                          {isSuccess ? (
                            <button
                              className="rep-bs font-mono text-[9px] font-bold px-1.5 py-0.5"
                              style={{ marginLeft: '4px' }}
                              onClick={() => {
                                triggerToast("Downloading File", `Streaming download payload for: ${h.name}.${h.format}`);
                                sendPrompt(`Download the report output file: ${h.name}.${h.format}`);
                              }}
                              title="Download report"
                            >
                              GET
                            </button>
                          ) : (
                            <button
                              className="rep-bs"
                              style={{ padding: '1px 6px', fontSize: '10px', marginLeft: '4px' }}
                              onClick={() => handleRetryRun(h.id, h.name)}
                            >
                              Retry ↗
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-3">
              <span className="text-[10px] text-[var(--tx-secondary)]">
                Showing 1–{filteredHistory.length} of {historyRuns.length} runs this month
              </span>
              <div className="flex gap-1">
                <button className="rep-bs text-[10px]" style={{ padding: '3px 7px' }} onClick={() => triggerToast('Navigation', 'Previous run logs loaded.')}>Prev</button>
                <button className="rep-bs text-[10px]" style={{ padding: '3px 7px' }} onClick={() => triggerToast('Navigation', 'Next run logs loaded.')}>Next</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BACKEND ARCHITECTURE INSPECT PANEL */}
      <div className="mt-4 px-3">
        <div className="rep-card rep-dev-card" style={{ marginBottom: 0 }}>
          <div
            className="rep-ch flex justify-between items-center gap-2"
            style={{ cursor: 'pointer', marginBottom: showBlueprint ? 10 : 0 }}
            onClick={() => setShowBlueprint(!showBlueprint)}
          >
            <div className="rep-ttl flex items-center gap-1.5">
              <span style={{ fontWeight: 600, fontSize: '12px' }}>Backend API Architecture Blueprint</span>
              <span className="rep-chip rep-dev-badge text-[8px] px-1 py-0.5 rounded bg-[var(--border)]">REST + Pipeline</span>
            </div>
            <span className="text-[9px] font-mono text-[var(--tx-muted)]">{showBlueprint ? '▲' : '▼'}</span>
          </div>

          {showBlueprint && (
            <div style={{ marginTop: '10px', borderTop: '0.5px dashed var(--border)', paddingTop: '10px' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                {/* Gateway contracts */}
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--accent-purple)' }} className="flex items-center gap-1">
                    REST Gateway Contracts
                  </h4>
                  <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                    {[
                      { method: 'GET', url: '/api/reports/templates', desc: 'Returns all loaded layout configurations. Cached in Redis (24h TTL).' },
                      { method: 'POST', url: '/api/reports/generate', desc: 'Launches asynchronous worker execution. Returns job ID instantly.' },
                      { method: 'GET', url: '/api/reports/jobs/:jobId', desc: 'Retrieves real-time processing percentages & download links (no Redis).' },
                      { method: 'GET', url: '/api/reports/schedules', desc: 'Gathers active cron schemas, channels, and error triggers. Redis (30s TTL).' },
                      { method: 'POST', url: '/api/reports/schedules', desc: 'Creates a new Cron trigger layout linked to distribution lists.' },
                      { method: 'PATCH', url: '/api/reports/schedules/:id', desc: 'Resumes or pauses active schedules or adjusts cron frequency parameters.' },
                      { method: 'GET', url: '/api/reports/history', desc: 'Exposes delivery success statistics and paginated run registers. Redis (1m TTL).' },
                      { method: 'POST', url: '/api/reports/history/:runId/retry', desc: 'Re-triggers execution parameters for failed historical configurations.' }
                    ].map((api, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-input, #12182c)', padding: '5px', borderRadius: '4px', border: '0.5px solid var(--border)' }}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span style={{
                            color: api.method === 'GET' ? '#10B981' : api.method === 'POST' ? '#F59E0B' : '#EF4444',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            fontSize: '8px'
                          }}>{api.method}</span>
                          <span className="font-mono font-medium">{api.url}</span>
                        </div>
                        <div style={{ color: 'var(--tx-secondary)' }} className="leading-tight">{api.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Websocket and scheduler specs */}
                <div className="flex flex-col gap-3">
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--accent-purple)' }} className="flex items-center gap-1">
                      Async Generation Pipeline (3 Stages)
                    </h4>
                    <div style={{ background: 'var(--bg-input, #12182c)', padding: '8px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)', lineHeight: '1.35' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Stage 1: Data Aggregation</strong><br />
                        Queries sub-services (`/patterns`, `/cost`, `/equipment`) to construct a unified telemetry context block.
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Stage 2: Render Server</strong><br />
                        Executes Headless Puppeteer (PDF layout cover-to-footer), streams direct rows (CSV), or builds indexed Excel worksheets.
                      </div>
                      <div>
                        <strong>Stage 3: Dispatcher Delivery</strong><br />
                        Pushes documents to configured Nodemailer gateways, Slack Files APIs, SFTP folders, or webhook servers.
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--accent-purple)' }} className="flex items-center gap-1">
                      BullMQ Scheduling Engine
                    </h4>
                    <div style={{ background: 'var(--bg-input, #12182c)', padding: '8px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)', fontFamily: 'monospace', fontSize: '9px', lineHeight: '1.4' }}>
                      Robust scheduled triggers utilize Redis backed **BullMQ** for absolute delivery guarantee.<br />
                      Automatic failure retries: up to 3 attempts with exponential backoff (1min, 5min, 15min) before reporting failures to platform channels.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LOADER PROGRESS MODAL */}
      <div className={`rep-modal-overlay ${loader.active ? 'active' : ''}`}>
        <div className="rep-modal-box">
          <div className="flex justify-center mb-1">
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/5 text-[var(--accent-purple)] animate-pulse rounded">
              PROCESSING
            </span>
          </div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginTop: '10px', color: 'var(--tx-primary)' }}>{loader.title}</h3>
          <p style={{ fontSize: '10px', color: 'var(--tx-secondary)', marginTop: '4px' }}>{loader.desc}</p>

          <div className="rep-prog-wrap">
            <div
              className="rep-prog-bar"
              style={{
                width: `${loader.progress}%`,
                backgroundColor: 'var(--accent-purple)'
              }}
            />
          </div>
        </div>
      </div>

      {/* FLOATING NOTIFICATION TOAST */}
      <div className={`rep-toast ${toast.show ? 'active' : ''}`}>
        <div className="flex flex-col text-left">
          <span style={{ fontWeight: 600, fontSize: '10px', color: 'var(--tx-primary)' }}>{toast.title}</span>
          <span style={{ color: 'var(--tx-secondary)', fontSize: '9px', marginTop: '1px' }}>{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
