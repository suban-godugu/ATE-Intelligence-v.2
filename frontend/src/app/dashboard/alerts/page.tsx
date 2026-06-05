"use client";

import { useState } from 'react';
import { sendPrompt } from '@/lib/sendPrompt';


interface Alert {
  id: number;
  severity: 'critical' | 'warning' | 'info';
  module: string;
  name: string;
  desc: string;
  code?: string;
  triggered: string;
  delivered: string;
  ack: boolean;
  fab: string;
}

interface AlertRule {
  id: number;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  module: string;
  detail: string;
  type: 'Threshold' | 'AI anomaly' | 'AI trend';
  enabled: boolean;
}

interface AlertHistoryItem {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  module: string;
  triggered: string;
  resolved: string;
  resolveTime: string;
  resolvedBy: string;
  delivered: string;
}

export default function AlertsPage() {
  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<'active' | 'rules' | 'channels' | 'hist'>('active');
  const [selectedFab, setSelectedFab] = useState('All fabs');
  const [selectedModule, setSelectedModule] = useState('All modules');

  // Active Alerts tab filters
  const [activeSeverity, setActiveSeverity] = useState('All');
  const [activeMod, setActiveMod] = useState('All');
  const [activeAck, setActiveAck] = useState('unacknowledged');

  // History filters
  const [histSeverity, setHistSeverity] = useState('All');
  const [histModule, setHistModule] = useState('All');

  // Developer blueprint accordion toggle
  const [showBlueprint, setShowBlueprint] = useState(false);

  // Floating Toast Notification state
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  // New Rule Form Builder state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleModule, setNewRuleModule] = useState('Equipment');
  const [newRuleMetric, setNewRuleMetric] = useState('Tester temperature (°C)');
  const [conditionType, setConditionType] = useState<'thresh' | 'anomaly' | 'trend'>('thresh');
  const [thresholdOp, setThresholdOp] = useState('Greater than');
  const [thresholdVal, setThresholdVal] = useState('75');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'critical' | 'warning' | 'info'>('critical');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifySMS, setNotifySMS] = useState(false);
  const [notifyWebhook, setNotifyWebhook] = useState(false);
  const [autoResolve, setAutoResolve] = useState('Manual only');

  // Active Alerts Dataset
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      severity: 'critical',
      module: 'Equipment',
      name: 'ATE-07 · Fab C — Thermal calibration failure',
      desc: 'Tester temperature reached 91°C, exceeding critical threshold of 75°C. Tester taken offline automatically.',
      code: 'THERM_CAL_FAIL_0x4F',
      triggered: '2h ago',
      delivered: 'Email + Slack',
      ack: false,
      fab: 'Fab C'
    },
    {
      id: 2,
      severity: 'warning',
      module: 'Equipment',
      name: 'ATE-03 · Fab A — High operating temperature',
      desc: 'Operating at 61°C, above warning threshold of 55°C. Health score declining at -4% per week. Calibration due in 3 days.',
      triggered: '6h ago',
      delivered: 'Email',
      ack: true,
      fab: 'Fab A'
    },
    {
      id: 3,
      severity: 'warning',
      module: 'Cost intelligence',
      name: 'Cost spike detected — Fab C · LOT_20240511',
      desc: 'Test cost per die reached $0.0542, exceeding the 2.5σ anomaly threshold of $0.048. Primary driver: extended scan chain time due to ATE-07 downtime.',
      triggered: '4h ago',
      delivered: 'Slack',
      ack: false,
      fab: 'Fab C'
    },
    {
      id: 4,
      severity: 'info',
      module: 'Pattern analysis',
      name: 'Pattern coverage below target — Fab B · Analog domain',
      desc: 'Analog domain fault coverage at 74.1%, below the configured 90% threshold. 3 consecutive lots affected. No immediate action required but trending downward.',
      triggered: '1 day ago',
      delivered: 'Email',
      ack: true,
      fab: 'Fab B'
    }
  ]);

  // Alert Rules Dataset
  const [rules, setRules] = useState<AlertRule[]>([
    { id: 1, name: 'Equipment temperature critical', severity: 'critical', module: 'Equipment', detail: 'Equipment · Temp > 75°C → Email + Slack', type: 'Threshold', enabled: true },
    { id: 2, name: 'Cost per die anomaly', severity: 'warning', module: 'Cost intelligence', detail: 'Cost intelligence · AI anomaly (2.5σ) → Slack', type: 'AI anomaly', enabled: true },
    { id: 3, name: 'Coverage below threshold', severity: 'info', module: 'Pattern analysis', detail: 'Pattern analysis · Coverage < 90% → Email', type: 'Threshold', enabled: true },
    { id: 4, name: 'Yield trend declining', severity: 'warning', module: 'Cost intelligence', detail: 'Cost intelligence · Yield drops >2% week-over-week → Email + Slack', type: 'AI trend', enabled: true },
    { id: 5, name: 'LBIST signature mismatch', severity: 'critical', module: 'Pattern analysis', detail: 'Pattern analysis · Any LBIST mismatch → Email + Slack + SMS', type: 'Threshold', enabled: true }
  ]);

  // Alert History Dataset
  const [historyItems] = useState<AlertHistoryItem[]>([
    { id: 'h-1', name: 'Tester temp. critical', severity: 'critical', module: 'Equipment', triggered: 'May 25 · 10:14', resolved: 'Active', resolveTime: '—', resolvedBy: '—', delivered: 'Email · Slack' },
    { id: 'h-2', name: 'High temp. warning', severity: 'warning', module: 'Equipment', triggered: 'May 25 · 06:22', resolved: 'Active', resolveTime: '—', resolvedBy: 'Acknowledged', delivered: 'Email' },
    { id: 'h-3', name: 'Cost per die anomaly', severity: 'warning', module: 'Cost intel', triggered: 'May 24 · 18:04', resolved: 'Active', resolveTime: '—', resolvedBy: '—', delivered: 'Slack' },
    { id: 'h-4', name: 'Coverage below target', severity: 'info', module: 'Pattern', triggered: 'May 24 · 09:11', resolved: 'May 25 · 08:00', resolveTime: '22.8 hrs', resolvedBy: 'Auto', delivered: 'Email' },
    { id: 'h-5', name: 'LBIST sig. mismatch', severity: 'critical', module: 'Pattern', triggered: 'May 23 · 14:32', resolved: 'May 23 · 17:12', resolveTime: '2.7 hrs', resolvedBy: 'SG', delivered: 'Email · Slack · SMS' },
    { id: 'h-6', name: 'Yield trend decline', severity: 'warning', module: 'Cost intel', triggered: 'May 22 · 08:00', resolved: 'May 23 · 08:00', resolveTime: '24.0 hrs', resolvedBy: 'Auto', delivered: 'Email · Slack' },
    { id: 'h-7', name: 'Tester utilisation low', severity: 'info', module: 'Equipment', triggered: 'May 21 · 12:00', resolved: 'May 22 · 09:00', resolveTime: '21.0 hrs', resolvedBy: 'Auto', delivered: 'Email' }
  ]);

  // Toast helper
  const triggerToast = (title: string, message: string) => {
    setToast({ show: true, title, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Safe send prompt dispatcher wrapper
  const handleSendPrompt = (text: string) => {
    sendPrompt(text);
    triggerToast("Prompt Dispatched", `Sent: "${text.substring(0, 40)}..."`);
  };

  // Acknowledge single alert action
  const acknowledgeAlert = (id: number) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, ack: true } : a)));
    triggerToast('Alert Acknowledged', 'Status synchronized successfully across fleet channels.');
    sendPrompt(`Acknowledge the active alert ID ${id} for ATE telemetry`);
  };

  // Acknowledge all active alerts
  const acknowledgeAllAlerts = () => {
    setAlerts(prev => prev.map(a => ({ ...a, ack: true })));
    triggerToast('All Acknowledged', 'All active alerts marked as read.');
    sendPrompt('Acknowledge all unacknowledged active alerts on this dashboard');
  };

  // Resolve alert action
  const resolveAlert = (id: number) => {
    triggerToast('Alert Resolved', 'Alert event logged and closed.');
    setAlerts(prev => prev.filter(a => a.id !== id));
    sendPrompt(`Resolve the active alert ID ${id} in ATE platform`);
  };

  // Toggle alert rule enabled switch
  const toggleRuleEnabled = (id: number) => {
    setRules(prev =>
      prev.map(r => {
        if (r.id === id) {
          const nextState = !r.enabled;
          triggerToast(
            nextState ? 'Rule Enabled' : 'Rule Disabled',
            nextState ? 'Alert monitoring active.' : 'Alert notifications paused for this configuration.'
          );
          return { ...r, enabled: nextState };
        }
        return r;
      })
    );
  };

  // Create new rule save action
  const saveNewRule = () => {
    const ruleName = newRuleName.trim() || `Watch ${newRuleMetric}`;
    const newId = Date.now();
    const typeLabel = conditionType === 'thresh' ? 'Threshold' : conditionType === 'anomaly' ? 'AI anomaly' : 'AI trend';
    const detailLabel = `${newRuleModule} · ${newRuleMetric} ${thresholdOp === 'Greater than' ? '>' : thresholdOp === 'Less than' ? '<' : '='} ${thresholdVal} → ${
      [notifyEmail && 'Email', notifySlack && 'Slack', notifySMS && 'SMS', notifyWebhook && 'Webhook'].filter(Boolean).join(' + ') || 'None'
    }`;

    const newRule: AlertRule = {
      id: newId,
      name: ruleName,
      severity: newRuleSeverity,
      module: newRuleModule,
      detail: detailLabel,
      type: typeLabel,
      enabled: true
    };

    setRules(prev => [...prev, newRule]);
    setNewRuleName('');
    triggerToast('Rule Created', `Successfully registered "${ruleName}" rule.`);
    sendPrompt(`Save this new alert rule configuration: ${ruleName} monitoring ${newRuleMetric} on module ${newRuleModule}`);
  };

  // Dry run test rule simulation
  const testRule = () => {
    triggerToast('Dry Run Executed', 'Evaluating rule constraints in simulation against active telemetry.');
  };

  // Filtered lists computation
  const filteredAlerts = alerts.filter(a => {
    // Global selectors
    if (selectedFab !== 'All fabs' && a.fab !== selectedFab) return false;
    if (selectedModule !== 'All modules' && a.module.toLowerCase() !== selectedModule.toLowerCase()) return false;

    // Tab level active alerts filters
    if (activeSeverity !== 'All' && a.severity !== activeSeverity) return false;
    if (activeMod !== 'All' && a.module !== activeMod) return false;
    if (activeAck === 'unacknowledged' && a.ack) return false;
    if (activeAck === 'acknowledged' && !a.ack) return false;

    return true;
  });

  const filteredHistory = historyItems.filter(h => {
    if (histSeverity !== 'All' && h.severity !== histSeverity) return false;
    if (histModule !== 'All' && h.module.toLowerCase().includes(histModule.toLowerCase())) return false;
    return true;
  });

  // KPI Calculations
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;
  const activeCountTotal = alerts.length;

  const totalRules = rules.length;
  const activeRulesCount = rules.filter(r => r.enabled).length;
  const aiAnomalyRulesCount = rules.filter(r => r.type !== 'Threshold').length;
  const thresholdRulesCount = rules.filter(r => r.type === 'Threshold').length;

  return (
    <div className="al-container animate-fade-in pb-12">
      {/* TOPBAR */}
      <div className="al-topbar" style={{ paddingLeft: '4px', borderLeft: '3px solid', borderImage: 'linear-gradient(to bottom, var(--accent-amber), transparent) 1' }}>
        <div>
          <h1 className="al-ttl flex items-center gap-2">
            <span className="font-mono text-[var(--accent-amber)] font-bold select-none">[!]</span>
            Alerts
            <span className="al-badge al-bgr text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-1 select-none">
              {activeCountTotal} active
            </span>
          </h1>
          <p className="al-tsub">Configurable threshold alerts, anomaly detection notifications, and Slack/email integration</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          {/* Fab Selector */}
          <select className="al-sel" value={selectedFab} onChange={(e) => { setSelectedFab(e.target.value); triggerToast('Fab Filter Applied', 'Dashboard updated successfully.'); }}>
            <option>All fabs</option>
            <option>Fab A</option>
            <option>Fab B</option>
            <option>Fab C</option>
          </select>

          {/* Module Selector */}
          <select className="al-sel" value={selectedModule} onChange={(e) => { setSelectedModule(e.target.value); triggerToast('Module Filter Applied', 'Dashboard updated successfully.'); }}>
            <option>All modules</option>
            <option>Pattern analysis</option>
            <option>Equipment</option>
            <option>Cost intelligence</option>
            <option>Test optimization</option>
          </select>

          {/* New Rule Button */}
          <button className="al-bp flex items-center gap-1.5 font-mono" onClick={() => { setActiveTab('rules'); triggerToast('Create Rule Mode', 'Form layout prepped.'); }}>
            [ + ] NEW RULE
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="al-tabs">
        <button className={`al-tab flex items-center gap-1.5 ${activeTab === 'active' ? 'on' : ''}`} onClick={() => setActiveTab('active')}>
          ACTIVE ALERTS
          <span className="al-badge al-bgr text-[10px] px-1 py-0.5 ml-0.5 rounded">
            {activeCountTotal}
          </span>
        </button>
        <button className={`al-tab ${activeTab === 'rules' ? 'on' : ''}`} onClick={() => setActiveTab('rules')}>
          ALERT RULES
        </button>
        <button className={`al-tab ${activeTab === 'channels' ? 'on' : ''}`} onClick={() => setActiveTab('channels')}>
          CHANNELS
        </button>
        <button className={`al-tab ${activeTab === 'hist' ? 'on' : ''}`} onClick={() => setActiveTab('hist')}>
          ALERT HISTORY
        </button>
      </div>

      {/* BODY CONTENT */}
      <div className="al-body">
        {/* ======================================================== */}
        {/* TAB 1: ACTIVE ALERTS */}
        {/* ======================================================== */}
        <div className={`al-tc ${activeTab === 'active' ? 'on' : ''}`}>
          {/* KPI Cards Row */}
          <div className="al-krow5">
            <div className="al-kpi">
              <div className="al-kl">Critical</div>
              <div className="al-kv" style={{ color: '#E24B4A' }}>{criticalCount}</div>
              <div className="al-kd">Needs immediate action</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Warning</div>
              <div className="al-kv" style={{ color: '#F59E0B' }}>{warningCount}</div>
              <div className="al-kd">Review recommended</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Info</div>
              <div className="al-kv" style={{ color: '#3B82F6' }}>{infoCount}</div>
              <div className="al-kd">Informational only</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Resolved today</div>
              <div className="al-kv" style={{ color: '#10B981' }}>7</div>
              <div className="al-kd">Auto or manual</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Avg resolve time</div>
              <div className="al-kv">3.4 hrs</div>
              <div className="al-kd">Last 30 days</div>
            </div>
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', gap: '7px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <select className="al-sel" value={activeSeverity} onChange={(e) => setActiveSeverity(e.target.value)}>
              <option value="All">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select className="al-sel" value={activeMod} onChange={(e) => setActiveMod(e.target.value)}>
              <option value="All">All modules</option>
              <option value="Equipment">Equipment</option>
              <option value="Pattern analysis">Pattern analysis</option>
              <option value="Cost intelligence">Cost intelligence</option>
            </select>

            <select className="al-sel" value={activeAck} onChange={(e) => setActiveAck(e.target.value)}>
              <option value="unacknowledged">Unacknowledged</option>
              <option value="all">All active</option>
              <option value="acknowledged">Acknowledged</option>
            </select>

            <button className="al-bs" style={{ marginLeft: 'auto', fontSize: '10px', padding: '4px 10px' }} onClick={acknowledgeAllAlerts}>
              Mark all acknowledged
            </button>
          </div>

          {/* Active Alerts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map(a => (
                <div
                  key={a.id}
                  className="al-arow"
                  style={{
                    background: a.severity === 'critical' ? 'rgba(239, 68, 68, 0.04)' : a.severity === 'warning' ? 'rgba(245, 158, 11, 0.04)' : 'rgba(59, 130, 246, 0.04)',
                    borderColor: a.severity === 'critical' ? 'rgba(239, 68, 68, 0.25)' : a.severity === 'warning' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.25)'
                  }}
                >
                  <span className="font-mono text-xs font-bold shrink-0 mt-0.5 select-none" style={{
                    color: a.severity === 'critical' ? '#E24B4A' : a.severity === 'warning' ? '#F59E0B' : '#3B82F6'
                  }}>
                    {a.severity === 'critical' ? '[CRIT]' : a.severity === 'warning' ? '[WARN]' : '[INFO]'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: a.severity === 'critical' ? '#E24B4A' : a.severity === 'warning' ? '#F59E0B' : '#3B82F6' }}>
                        {a.name}
                      </span>
                      <span className={`al-badge ${a.severity === 'critical' ? 'al-bgr' : a.severity === 'warning' ? 'al-bga' : 'al-bgb'}`}>
                        {a.severity}
                      </span>
                      <span className="al-badge al-bggy">{a.module}</span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--tx-secondary)', marginBottom: '4px', lineHeight: 1.35 }}>
                      {a.desc}
                      {a.code && (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', padding: '1px 4px', borderRadius: '3px', marginLeft: '5px' }}>
                          {a.code}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--tx-muted)', flexWrap: 'wrap' }} className="font-mono">
                      <span>TIME: {a.triggered}</span>
                      <span>DELIVERY: {a.delivered}</span>
                      <span>
                        {a.ack ? (
                          <span style={{ color: 'var(--accent-teal)' }}>[✓] ACKNOWLEDGED · SG</span>
                        ) : (
                          <span style={{ color: 'var(--accent-red)' }}>[ ] UNACKNOWLEDGED</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0 ml-2.5">
                    <button
                      className="al-bp"
                      style={{ fontSize: '10px', padding: '4px 9px' }}
                      onClick={() => {
                        const promptMsg = a.severity === 'critical'
                          ? `Investigate ${a.name.split('·')[0].trim()} calibration failure and give me a step-by-step repair checklist`
                          : a.module === 'Cost intelligence'
                          ? `Analyse the cost spike on LOT_20240511 Fab C and identify the root cause`
                          : `Investigate why analog domain coverage is below 90% threshold in Fab B and suggest fixes`;
                        handleSendPrompt(promptMsg);
                      }}
                    >
                      {a.severity === 'critical' ? 'Investigate ↗' : a.module === 'Cost intelligence' ? 'Analyse ↗' : 'View in PA ↗'}
                    </button>

                    {!a.ack && (
                      <button
                        className="al-bs"
                        style={{ fontSize: '10px', padding: '4px 9px', borderColor: 'var(--border)', color: 'var(--tx-primary)' }}
                        onClick={() => acknowledgeAlert(a.id)}
                      >
                        Acknowledge
                      </button>
                    )}

                    <button
                      className="al-bs"
                      style={{ fontSize: '10px', padding: '4px 9px', borderColor: 'var(--border)', color: 'var(--tx-primary)' }}
                      onClick={() => resolveAlert(a.id)}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="al-card flex flex-col items-center justify-center p-8 text-center text-[var(--tx-muted)] border-dashed">
                <span className="font-mono text-lg mb-2 block select-none">[!]</span>
                No active alerts match current filters.
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 2: ALERT RULES */}
        {/* ======================================================== */}
        <div className={`al-tc ${activeTab === 'rules' ? 'on' : ''}`}>
          {/* KPI Row */}
          <div className="al-krow">
            <div className="al-kpi">
              <div className="al-kl">Total rules</div>
              <div className="al-kv">{totalRules}</div>
              <div className="al-kd">Across all modules</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Active rules</div>
              <div className="al-kv" style={{ color: '#10B981' }}>{activeRulesCount}</div>
              <div className="al-kd">Enforcing live filters</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">AI anomaly rules</div>
              <div className="al-kv" style={{ color: '#8B5CF6' }}>{aiAnomalyRulesCount}</div>
              <div className="al-kd">ML-powered detection</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Threshold rules</div>
              <div className="al-kv">{thresholdRulesCount}</div>
              <div className="al-kd">Static thresholds</div>
            </div>
          </div>

          <div className="al-g2">
            {/* LEFT: Create new rule card */}
            <div className="al-card" style={{ marginBottom: 0 }}>
              <div className="al-ch flex justify-between items-center gap-2">
                <h3 className="al-ct">Create new alert rule</h3>
                <span className="al-badge al-bgp text-[8px] font-mono">Z-SCORE OPTION ACTIVE</span>
              </div>

              <div className="al-form-row">
                <label className="al-form-lbl">Rule name</label>
                <input
                  type="text"
                  className="al-form-inp"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Equipment temperature critical"
                />
              </div>

              <div className="al-form-row">
                <label className="al-form-lbl">Module</label>
                <select className="al-form-inp" value={newRuleModule} onChange={(e) => setNewRuleModule(e.target.value)}>
                  <option>Equipment</option>
                  <option>Pattern analysis</option>
                  <option>Cost intelligence</option>
                  <option>Test optimization</option>
                  <option>Wafer analytics</option>
                </select>
              </div>

              <div className="al-form-row">
                <label className="al-form-lbl">Metric to watch</label>
                <select className="al-form-inp" value={newRuleMetric} onChange={(e) => setNewRuleMetric(e.target.value)}>
                  <option>Tester temperature (°C)</option>
                  <option>Tester health score (%)</option>
                  <option>Cost per die ($)</option>
                  <option>Fault coverage (%)</option>
                  <option>Yield (%)</option>
                  <option>Test time (ms)</option>
                  <option>MBIST fail rate (%)</option>
                </select>
              </div>

              <div className="al-slbl">Condition type</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <button className={conditionType === 'thresh' ? 'al-bp' : 'al-bs'} style={{ fontSize: '10px' }} onClick={() => setConditionType('thresh')}>
                  Threshold
                </button>
                <button className={conditionType === 'anomaly' ? 'al-bp' : 'al-bs'} style={{ fontSize: '10px' }} onClick={() => setConditionType('anomaly')}>
                  AI anomaly detect
                </button>
                <button className={conditionType === 'trend' ? 'al-bp' : 'al-bs'} style={{ fontSize: '10px' }} onClick={() => setConditionType('trend')}>
                  Trend / rate of change
                </button>
              </div>

              <div className="al-form-row">
                <label className="al-form-lbl">Threshold value</label>
                <div style={{ display: 'flex', gap: '7px' }}>
                  <select className="al-form-inp" style={{ width: '110px' }} value={thresholdOp} onChange={(e) => setThresholdOp(e.target.value)}>
                    <option>Greater than</option>
                    <option>Less than</option>
                    <option>Equal to</option>
                  </select>
                  <input
                    type="number"
                    className="al-form-inp"
                    style={{ flex: 1 }}
                    value={thresholdVal}
                    onChange={(e) => setThresholdVal(e.target.value)}
                    placeholder="75"
                  />
                </div>
              </div>

              <div className="al-form-row">
                <label className="al-form-lbl">Severity</label>
                <select className="al-form-inp" value={newRuleSeverity} onChange={(e) => setNewRuleSeverity(e.target.value as any)}>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div className="al-form-row">
                <label className="al-form-lbl">Notify channels</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '3px' }}>
                  <label className="al-chk-lbl flex items-center gap-1 select-none text-[11px] text-[var(--tx-secondary)]">
                    <input type="checkbox" checked={notifyEmail} onChange={() => setNotifyEmail(!notifyEmail)} /> Email
                  </label>
                  <label className="al-chk-lbl flex items-center gap-1 select-none text-[11px] text-[var(--tx-secondary)]">
                    <input type="checkbox" checked={notifySlack} onChange={() => setNotifySlack(!notifySlack)} /> Slack
                  </label>
                  <label className="al-chk-lbl flex items-center gap-1 select-none text-[11px] text-[var(--tx-secondary)]">
                    <input type="checkbox" checked={notifySMS} onChange={() => setNotifySMS(!notifySMS)} /> SMS
                  </label>
                  <label className="al-chk-lbl flex items-center gap-1 select-none text-[11px] text-[var(--tx-secondary)]">
                    <input type="checkbox" checked={notifyWebhook} onChange={() => setNotifyWebhook(!notifyWebhook)} /> Webhook
                  </label>
                </div>
              </div>

              <div className="al-form-row">
                <label className="al-form-lbl">Auto-resolve after</label>
                <select className="al-form-inp" value={autoResolve} onChange={(e) => setAutoResolve(e.target.value)}>
                  <option>Manual only</option>
                  <option>1 hour</option>
                  <option>4 hours</option>
                  <option>24 hours</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '7px', marginTop: '10px' }}>
                <button className="al-bp" style={{ flex: 1 }} onClick={saveNewRule}>
                  Save rule ↗
                </button>
                <button className="al-bs" onClick={testRule}>
                  Test rule
                </button>
              </div>
            </div>

            {/* RIGHT: Existing rules list */}
            <div>
              <div className="al-slbl" style={{ marginTop: 0 }}>Existing rules</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rules.map(r => (
                  <div key={r.id} className="al-rule-card animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx-primary)' }}>{r.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`al-badge ${r.severity === 'critical' ? 'al-bgr' : r.severity === 'warning' ? 'al-bga' : 'al-bgb'}`}>
                          {r.severity}
                        </span>
                        <div
                          className="al-tog cursor-pointer"
                          style={{ backgroundColor: r.enabled ? '#534AB7' : '#888780' }}
                          onClick={() => toggleRuleEnabled(r.id)}
                        >
                          <div className="al-tog-ball" style={{ marginLeft: r.enabled ? 'auto' : '0' }}></div>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--tx-secondary)', marginBottom: '4px' }}>
                      {r.detail}
                    </p>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span className="al-badge al-bggy">{r.type}</span>
                      <span className="al-badge al-bggy">{r.module}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 3: CHANNELS */}
        {/* ======================================================== */}
        <div className={`al-tc ${activeTab === 'channels' ? 'on' : ''}`}>
          <div className="al-krow">
            <div className="al-kpi">
              <div className="al-kl">Channels configured</div>
              <div className="al-kv">4</div>
              <div className="al-kd">Core notification paths</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Connected</div>
              <div className="al-kv" style={{ color: '#10B981' }}>3</div>
              <div className="al-kd">Active routing targets</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Alerts sent today</div>
              <div className="al-kv">14</div>
              <div className="al-kd">All combined channels</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Delivery failures</div>
              <div className="al-kv" style={{ color: '#E24B4A' }}>1</div>
              <div className="al-kd">SMTP error · May 1</div>
            </div>
          </div>

          <div className="al-g2">
            {/* LEFT: Channel connectors list */}
            <div>
              {/* Email Card */}
              <div className="al-ch-card">
                <div className="al-ch-icon font-mono text-[9px] font-bold shrink-0 flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-teal)', width: '32px', height: '32px', borderRadius: '4px' }}>
                  SMTP
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>Email (SMTP)</span>
                    <span className="al-badge al-bgg">Connected</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--tx-secondary)' }}>smtp.company.com · port 587 · TLS</div>
                  <div style={{ fontSize: '10px', color: 'var(--tx-muted)', marginTop: '1px' }}>Last sent: 2 hours ago · 9 recipients</div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <button className="al-bs" style={{ fontSize: '10px', padding: '4px 9px' }} onClick={() => triggerToast('SMTP Config Opened', 'Email parameters editable.')}>Edit</button>
                  <button className="al-bs" style={{ fontSize: '10px', padding: '4px 9px' }} onClick={() => handleSendPrompt('Test the email SMTP delivery channel in the Alerts module')}>Test</button>
                </div>
              </div>

              {/* Slack Card */}
              <div className="al-ch-card">
                <div className="al-ch-icon font-mono text-[9px] font-bold shrink-0 flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)', width: '32px', height: '32px', borderRadius: '4px' }}>
                  SLACK
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>Slack</span>
                    <span className="al-badge al-bgg">Connected</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--tx-secondary)' }}>#ate-alerts · #ate-critical · company.slack.com</div>
                  <div style={{ fontSize: '10px', color: 'var(--tx-muted)', marginTop: '1px' }}>Last sent: 4 hours ago · 2 channels</div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <button className="al-bs" style={{ fontSize: '10px', padding: '4px 9px' }} onClick={() => triggerToast('Slack API Config', 'Webhook properties loaded.')}>Edit</button>
                  <button className="al-bs" style={{ fontSize: '10px', padding: '4px 9px' }} onClick={() => handleSendPrompt('Test the Slack delivery channel for ATE Intelligence Alerts')}>Test</button>
                </div>
              </div>

              {/* Twilio Card */}
              <div className="al-ch-card">
                <div className="al-ch-icon font-mono text-[9px] font-bold shrink-0 flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)', width: '32px', height: '32px', borderRadius: '4px' }}>
                  SMS
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>SMS (Twilio)</span>
                    <span className="al-badge al-bgg">Connected</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--tx-secondary)' }}>Critical alerts only · 3 phone numbers</div>
                  <div style={{ fontSize: '10px', color: 'var(--tx-muted)', marginTop: '1px' }}>Last sent: 2 days ago</div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <button className="al-bs" style={{ fontSize: '10px', padding: '4px 9px' }} onClick={() => triggerToast('Twilio SMS parameters', 'API settings active.')}>Edit</button>
                  <button className="al-bs" style={{ fontSize: '10px', padding: '4px 9px' }} onClick={() => triggerToast('Twilio API test', 'Dry-run ping sent successfully.')}>Test</button>
                </div>
              </div>

              {/* Webhook Card (Not configured) */}
              <div className="al-ch-card animate-fade-in" style={{ borderStyle: 'dashed' }}>
                <div className="al-ch-icon font-mono text-[9px] font-bold shrink-0 flex items-center justify-center text-[var(--tx-muted)]" style={{ background: 'rgba(255, 255, 255, 0.06)', width: '32px', height: '32px', borderRadius: '4px' }}>
                  POST
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx-secondary)' }}>Webhook</span>
                    <span className="al-badge al-bggy">Not configured</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--tx-muted)' }}>POST JSON payload to any endpoint</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button className="al-bp" style={{ fontSize: '10px', padding: '4px 9px' }} onClick={() => handleSendPrompt('Configure a webhook delivery channel for ATE Intelligence Alerts')}>
                    Configure ↗
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Alert routing & notification preferences */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Alert routing matrix */}
              <div className="al-card" style={{ marginBottom: 0 }}>
                <div className="al-ch">
                  <div>
                    <h3 className="al-ct">Alert routing rules</h3>
                    <p className="al-cs">Which severity goes where</p>
                  </div>
                </div>

                <div className="al-table-scroll overflow-x-auto">
                  <table className="al-tbl w-full text-left" style={{ tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>Severity</th>
                        <th style={{ width: '25%' }}>Email</th>
                        <th style={{ width: '22%' }}>Slack</th>
                        <th style={{ width: '16%' }}>SMS</th>
                        <th style={{ width: '15%' }}>Webhook</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 500, color: '#E24B4A' }}>Critical</td>
                        <td><span style={{ color: '#10B981', fontWeight: 600 }} className="flex items-center gap-1 font-mono">[✓] All</span></td>
                        <td><span style={{ color: '#10B981', fontWeight: 600 }} className="flex items-center gap-1 font-mono">[✓] #ate-critical</span></td>
                        <td><span style={{ color: '#10B981', fontWeight: 600 }} className="flex items-center gap-1 font-mono">[✓] Yes</span></td>
                        <td style={{ color: 'var(--tx-muted)' }}>—</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500, color: '#F59E0B' }}>Warning</td>
                        <td><span style={{ color: '#10B981', fontWeight: 600 }} className="flex items-center gap-1 font-mono">[✓] Engineers</span></td>
                        <td><span style={{ color: '#10B981', fontWeight: 600 }} className="flex items-center gap-1 font-mono">[✓] #ate-alerts</span></td>
                        <td style={{ color: 'var(--tx-muted)' }}>—</td>
                        <td style={{ color: 'var(--tx-muted)' }}>—</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500, color: '#3B82F6' }}>Info</td>
                        <td><span style={{ color: '#10B981', fontWeight: 600 }} className="flex items-center gap-1 font-mono">[✓] Digest</span></td>
                        <td style={{ color: 'var(--tx-muted)' }}>—</td>
                        <td style={{ color: 'var(--tx-muted)' }}>—</td>
                        <td style={{ color: 'var(--tx-muted)' }}>—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button className="al-bs" style={{ width: '100%', marginTop: '10px', fontSize: '10px' }} onClick={() => handleSendPrompt('Edit the alert routing rules and recipient lists in the Alerts channels configuration')}>
                  Edit routing ↗
                </button>
              </div>

              {/* Notification Preferences */}
              <div className="al-card" style={{ marginBottom: 0 }}>
                <div className="al-ch">
                  <h3 className="al-ct">Notification preferences</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }} className="text-xs">
                  <div className="al-fr">
                    <span className="al-fl">Quiet hours</span>
                    <span className="al-fv" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>23:00 – 07:00</span>
                      <span style={{ color: 'var(--tx-secondary)', fontSize: '9px' }}>(critical only)</span>
                    </span>
                  </div>
                  <div className="al-fr">
                    <span className="al-fl">Alert grouping</span>
                    <span className="al-fv">5 min window</span>
                  </div>
                  <div className="al-fr">
                    <span className="al-fl">Max alerts/hour</span>
                    <span className="al-fv">20</span>
                  </div>
                  <div className="al-fr">
                    <span className="al-fl">Escalation after</span>
                    <span className="al-fv">2 hrs unacknowledged</span>
                  </div>
                  <div className="al-fr">
                    <span className="al-fl">Escalate to</span>
                    <span className="al-fv">Team lead (email + SMS)</span>
                  </div>
                </div>

                <button className="al-bs" style={{ width: '100%', marginTop: '10px', fontSize: '10px' }} onClick={() => handleSendPrompt('Edit the notification preferences including quiet hours and escalation policy in ATE Alerts')}>
                  Edit preferences ↗
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 4: ALERT HISTORY */}
        {/* ======================================================== */}
        <div className={`al-tc ${activeTab === 'hist' ? 'on' : ''}`}>
          <div className="al-krow">
            <div className="al-kpi">
              <div className="al-kl">Total alerts (30d)</div>
              <div className="al-kv">124</div>
              <div className="al-kd">Trigger events logged</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Critical</div>
              <div className="al-kv" style={{ color: '#E24B4A' }}>8</div>
              <div className="al-kd" style={{ color: '#10B981', fontWeight: 500 }}><span className="font-mono text-xs">[✓]</span> All resolved</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Avg resolve time</div>
              <div className="al-kv">3.4 hrs</div>
              <div className="al-kd">Last 30 days</div>
            </div>
            <div className="al-kpi">
              <div className="al-kl">Delivery success rate</div>
              <div className="al-kv" style={{ color: '#10B981' }}>98.4%</div>
              <div className="al-kd">Across all dispatches</div>
            </div>
          </div>

          {/* History log table card */}
          <div className="al-card">
            <div className="al-ch">
              <div>
                <h3 className="al-ct">Alert history log</h3>
                <p className="al-cs">All triggered alerts — last 30 days</p>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="al-sel" value={histSeverity} onChange={(e) => setHistSeverity(e.target.value)}>
                  <option value="All">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>

                <select className="al-sel" value={histModule} onChange={(e) => setHistModule(e.target.value)}>
                  <option value="All">All modules</option>
                  <option value="equipment">Equipment</option>
                  <option value="pattern">Pattern analysis</option>
                  <option value="cost">Cost intelligence</option>
                </select>

                <button className="al-bs" style={{ fontSize: '10px', padding: '4px 8px' }} onClick={() => { triggerToast('Streaming Payload', 'Downloading alerts-history.csv stream.'); handleSendPrompt('Export the historical alerts log list as a CSV file attachment'); }}>
                  EXPORT
                </button>
              </div>
            </div>

            <div className="al-table-scroll overflow-x-auto">
              <table className="al-tbl w-full text-left">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Alert name</th>
                    <th style={{ width: '9%' }}>Severity</th>
                    <th style={{ width: '10%' }}>Module</th>
                    <th style={{ width: '13%' }}>Triggered</th>
                    <th style={{ width: '13%' }}>Resolved</th>
                    <th style={{ width: '9%' }}>Resolve time</th>
                    <th style={{ width: '11%' }}>Resolved by</th>
                    <th style={{ width: '13%' }}>Delivered to</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{h.name}</td>
                      <td>
                        <span className={`al-badge ${h.severity === 'critical' ? 'al-bgr' : h.severity === 'warning' ? 'al-bga' : 'al-bgb'}`}>
                          {h.severity}
                        </span>
                      </td>
                      <td>{h.module}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{h.triggered}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: h.resolved === 'Active' ? 'var(--tx-muted)' : 'inherit' }}>{h.resolved}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: h.resolveTime === '—' ? 'var(--tx-muted)' : 'inherit' }}>{h.resolveTime}</td>
                      <td style={{ color: h.resolvedBy === '—' ? 'var(--tx-muted)' : 'inherit' }}>{h.resolvedBy}</td>
                      <td>{h.delivered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--tx-secondary)' }}>
                Showing 1–{filteredHistory.length} of 124 alerts this month
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="al-bs" style={{ fontSize: '10px', padding: '3px 7px' }} onClick={() => triggerToast('Navigation', 'Previous history page loaded.')}>Prev</button>
                <button className="al-bs" style={{ fontSize: '10px', padding: '3px 7px' }} onClick={() => triggerToast('Navigation', 'Next history page loaded.')}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BACKEND ARCHITECTURE BLUEPRINT PANEL */}
      {/* ======================================================== */}
      <div style={{ padding: '12px', paddingTop: 0 }}>
        <div className="al-card al-dev-card" style={{ marginBottom: 0 }}>
          <div className="al-ch flex justify-between items-center gap-2 font-mono" style={{ cursor: 'pointer' }} onClick={() => setShowBlueprint(!showBlueprint)}>
            <div className="al-ttl flex items-center gap-1.5">
              <span className="text-[var(--accent-purple)] font-bold select-none">{`</>`}</span>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>BACKEND API ARCHITECTURE BLUEPRINT</span>
              <span className="al-badge al-dev-badge text-[8px] px-1 py-0.5 rounded bg-[var(--border)] font-mono">REST + WS + EWMA</span>
            </div>
            <span className="text-[var(--tx-secondary)] text-[10px] select-none">{showBlueprint ? '▲' : '▼'}</span>
          </div>

          {showBlueprint && (
            <div style={{ marginTop: '10px', borderTop: '0.5px dashed var(--border)', paddingTop: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', fontSize: '10px' }} className="md:grid-cols-2">
                {/* Endpoints list */}
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--accent-purple)' }} className="font-mono">
                    [ REST GATEWAY CONTRACTS ]
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    <div style={{ background: 'var(--bg-sidebar)', padding: '5px', borderRadius: '4px', border: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                        <span style={{ color: '#10B981', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '8px' }}>GET</span>
                        <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>/api/alerts/active</span>
                      </div>
                      <div style={{ color: 'var(--tx-secondary)', lineHeight: 1.2 }}>Returns all active alerts. Severity, module, and unacked filters supported.</div>
                    </div>

                    <div style={{ background: 'var(--bg-sidebar)', padding: '5px', borderRadius: '4px', border: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                        <span style={{ color: '#EF4444', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '8px' }}>PATCH</span>
                        <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>/api/alerts/:id/acknowledge</span>
                      </div>
                      <div style={{ color: 'var(--tx-secondary)', lineHeight: 1.2 }}>Sets acknowledgedBy and acknowledgedAt timestamps on specified alert.</div>
                    </div>

                    <div style={{ background: 'var(--bg-sidebar)', padding: '5px', borderRadius: '4px', border: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                        <span style={{ color: '#EF4444', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '8px' }}>PATCH</span>
                        <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>/api/alerts/:id/resolve</span>
                      </div>
                      <div style={{ color: 'var(--tx-secondary)', lineHeight: 1.2 }}>Resolves active alert manually. Automatically computes resolveTimeMs.</div>
                    </div>

                    <div style={{ background: 'var(--bg-sidebar)', padding: '5px', borderRadius: '4px', border: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                        <span style={{ color: '#10B981', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '8px' }}>GET</span>
                        <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>/api/alerts/rules</span>
                      </div>
                      <div style={{ color: 'var(--tx-secondary)', lineHeight: 1.2 }}>Lists alert rules with counts for active threshold and AI anomaly rules.</div>
                    </div>

                    <div style={{ background: 'var(--bg-sidebar)', padding: '5px', borderRadius: '4px', border: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                        <span style={{ color: '#F59E0B', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '8px' }}>POST</span>
                        <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>/api/alerts/rules</span>
                      </div>
                      <div style={{ color: 'var(--tx-secondary)', lineHeight: 1.2 }}>Creates alert rule (Threshold, Anomaly, Trend). Dispatched to RabbitMQ.</div>
                    </div>
                  </div>
                </div>

                {/* Real-time details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--accent-purple)' }} className="font-mono">
                      [ WEBSOCKET PUSH GATEWAY ] `/ws/alerts`
                    </h4>
                    <div style={{ background: 'var(--bg-sidebar)', padding: '8px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)', lineHeight: 1.35 }}>
                      Provides continuous stream pushes directly from RabbitMQ event broker:<br />
                      - `new_alert`: Live threshold breaches pushed with zero latency.<br />
                      - `alert_updated`: Real-time sync on acknowledge/resolution state change.<br />
                      - Background polling evaluation loop handles equipment temperature every 30s, cost drivers every 5m, and coverage metrics on lot completion events.
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--accent-purple)' }} className="font-mono">
                      [ ANOMALY EVALUATION ENGINE ]
                    </h4>
                    <div style={{ background: 'var(--bg-sidebar)', padding: '8px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)', fontFamily: 'monospace', fontSize: '9px', lineHeight: 1.35 }}>
                      <strong>AI Anomaly EWMA + Z-Score:</strong><br />
                      EWMA<sub>t</sub> = &alpha; · Y<sub>t</sub> + (1 - &alpha;) · EWMA<sub>t-1</sub><br />
                      Z-Score = (Y<sub>t</sub> - EWMA<sub>t</sub>) / &sigma;<sub>stdDev</sub><br />
                      Breach fired if |Z-Score| &gt; &sigma;<sub>threshold</sub> (e.g. 2.5&sigma;)<br />
                      <strong>AI Trend Slope Formula:</strong><br />
                      Evaluates linear regression slope over rolling `trendWindowHours`. Yield drop warning fires if slope decline exceeding configured % per week is detected.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING TOAST */}
      <div className={`al-toast ${toast.show ? 'active' : ''}`}>
        <span className="font-mono text-xs text-[var(--accent-amber)] font-bold shrink-0 select-none">[!]</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '10px' }}>{toast.title}</span>
          <span style={{ color: 'var(--tx-secondary)', fontSize: '9px', marginTop: '1px' }}>{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
