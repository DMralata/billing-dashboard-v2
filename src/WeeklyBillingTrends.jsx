import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, Upload, Download, ArrowRight, ChevronRight } from 'lucide-react';

/* ─── Google Fonts ─────────────────────────────────────────────── */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:       #0d1117;
      --surface:  #161b22;
      --surface2: #1e2530;
      --border:   #2a3140;
      --text:     #e6edf3;
      --muted:    #7d8590;
      --teal:     #00d4aa;
      --teal-dim: rgba(0,212,170,0.12);
      --amber:    #f0a832;
      --amber-dim:rgba(240,168,50,0.12);
      --red:      #f07070;
      --red-dim:  rgba(240,112,112,0.12);
      --blue:     #58a6ff;
      --blue-dim: rgba(88,166,255,0.12);
      --green:    #56d364;
    }
    body { background: var(--bg); }
    .dash { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; padding: 32px; }
    .mono { font-family: 'DM Mono', monospace; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
    .header-sub { color: var(--muted); font-size: 13px; margin-top: 6px; font-family: 'DM Mono', monospace; }
    .upload-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); cursor: pointer; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.15s; }
    .upload-btn:hover { border-color: var(--teal); color: var(--teal); }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; position: relative; overflow: hidden; }
    .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
    .kpi-card.teal::before { background: var(--teal); }
    .kpi-card.amber::before { background: var(--amber); }
    .kpi-card.blue::before { background: var(--blue); }
    .kpi-card.green::before { background: var(--green); }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 12px; }
    .kpi-value { font-size: 30px; font-weight: 800; color: var(--text); font-family: 'DM Mono', monospace; }
    .kpi-change { display: flex; align-items: center; gap: 5px; margin-top: 8px; font-size: 12px; font-family: 'DM Mono', monospace; }
    .kpi-change.up { color: var(--teal); }
    .kpi-change.down { color: var(--red); }
    .kpi-vs { color: var(--muted); font-size: 11px; }

    /* Section card */
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .card-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .card-sub { font-size: 12px; color: var(--muted); margin-bottom: 20px; font-family: 'DM Mono', monospace; }

    /* Metric tabs */
    .metric-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
    .tab { padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--muted); transition: all 0.15s; }
    .tab.active { background: var(--teal-dim); border-color: var(--teal); color: var(--teal); }

    /* Two-col grid */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }

    /* Heatmap */
    .heatmap-wrap { overflow-x: auto; }
    .heatmap-table { border-collapse: collapse; table-layout: fixed; width: 100%; }
    .heatmap-table th { font-size: 10px; font-family: 'DM Mono', monospace; color: var(--muted); text-align: center; padding: 4px 2px; font-weight: 400; width: 52px; overflow: hidden; }
    .heatmap-table th.name-col { text-align: left; width: 160px; }
    .heatmap-table th.total-col { width: 52px; }
    .heatmap-table td { padding: 3px 2px; width: 52px; }
    .heatmap-table td.name-cell { font-size: 12px; color: var(--text); padding-right: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 160px; font-weight: 500; }
    .heat-cell { width: 46px; height: 26px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 9px; cursor: default; transition: transform 0.1s; margin: 0 auto; }
    .heat-cell:hover { transform: scale(1.15); z-index: 10; position: relative; }
    .hm-legend { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .hm-legend-label { font-size: 10px; color: var(--muted); font-family: 'DM Mono', monospace; }
    .hm-legend-boxes { display: flex; gap: 3px; }
    .hm-legend-box { width: 18px; height: 14px; border-radius: 3px; }

    /* Funnel */
    .funnel-container { display: flex; flex-direction: column; gap: 0; }
    .funnel-stage { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; cursor: pointer; transition: all 0.15s; }
    .funnel-stage:hover { border-color: var(--teal); }
    .funnel-stage.active { border-color: var(--teal); background: var(--teal-dim); }
    .funnel-connector { display: flex; align-items: center; justify-content: center; padding: 4px 0; gap: 12px; }
    .funnel-connector .arrow { color: var(--muted); font-size: 18px; }
    .funnel-connector .conv-rate { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--teal); background: var(--teal-dim); padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(0,212,170,0.3); }
    .stage-header { display: flex; justify-content: space-between; align-items: center; }
    .stage-code { font-size: 11px; font-family: 'DM Mono', monospace; color: var(--muted); background: var(--surface); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border); }
    .stage-name { font-size: 14px; font-weight: 700; color: var(--text); margin-top: 4px; }
    .stage-count { font-size: 32px; font-weight: 800; font-family: 'DM Mono', monospace; }
    .stage-count.psych { color: var(--blue); }
    .stage-count.assess { color: var(--amber); }
    .stage-count.therapy { color: var(--teal); }
    .stage-meta { font-size: 11px; color: var(--muted); margin-top: 2px; font-family: 'DM Mono', monospace; }
    .funnel-clients { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 14px; }
    .funnel-client-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border); }
    .funnel-client-row:last-child { border-bottom: none; }
    .fcr-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .fcr-meta { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; margin-top: 2px; }
    .fcr-badge { font-size: 10px; font-family: 'DM Mono', monospace; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .badge-red { background: var(--red-dim); color: var(--red); border: 1px solid rgba(240,112,112,0.3); }
    .badge-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(240,168,50,0.3); }
    .badge-green { background: rgba(86,211,100,0.12); color: var(--green); border: 1px solid rgba(86,211,100,0.3); }
    .badge-blue { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(88,166,255,0.3); }
    .badge-gray { background: rgba(125,133,144,0.15); color: var(--muted); border: 1px solid var(--border); }
    .not-viable-select { font-size: 11px; font-family: 'DM Mono', monospace; background: var(--surface); border: 1px solid var(--border); color: var(--muted); border-radius: 4px; padding: 2px 6px; cursor: pointer; }

    /* WoW changes */
    .wow-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; border: 1px solid var(--border); background: var(--surface2); }
    .wow-hours { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; margin-top: 3px; }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: right; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--surface2); }
    .data-table th:first-child { text-align: left; }
    .data-table td { padding: 11px 16px; text-align: right; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border); font-family: 'DM Mono', monospace; }
    .data-table td:first-child { text-align: left; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; }
    .data-table tr:hover td { background: var(--surface2); }
    .data-table tr:last-child td { border-bottom: none; }

    /* Export button */
    .export-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--teal-dim); border: 1px solid rgba(0,212,170,0.4); color: var(--teal); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: 'Syne', sans-serif; transition: all 0.15s; }
    .export-btn:hover { background: rgba(0,212,170,0.2); }
    .export-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Upload screen */
    .upload-screen { min-height: 100vh; background: var(--bg); display: flex; align-items: center; justify-content: center; }
    .upload-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 48px; max-width: 520px; width: 100%; }
    .upload-card h2 { font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
    .upload-card p { font-size: 13px; color: var(--muted); margin-bottom: 28px; line-height: 1.6; }
    .upload-steps { list-style: none; counter-reset: steps; margin-bottom: 28px; }
    .upload-steps li { counter-increment: steps; display: flex; gap: 12px; padding: 8px 0; font-size: 13px; color: var(--muted); }
    .upload-steps li::before { content: counter(steps); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; min-width: 22px; border-radius: 50%; background: var(--teal-dim); color: var(--teal); font-size: 11px; font-weight: 700; border: 1px solid rgba(0,212,170,0.3); }
    .upload-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 36px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--surface2); }
    .upload-zone:hover { border-color: var(--teal); background: var(--teal-dim); }
    .upload-zone input { display: none; }
    .upload-icon { font-size: 32px; margin-bottom: 12px; }
    .upload-zone-text { font-size: 14px; font-weight: 600; color: var(--teal); }
    .upload-zone-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

    /* Scrollable client list */
    .client-scroll { max-height: 340px; overflow-y: auto; }
    .client-scroll::-webkit-scrollbar { width: 4px; }
    .client-scroll::-webkit-scrollbar-track { background: transparent; }
    .client-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    /* tooltip override */
    .recharts-tooltip-wrapper { font-family: 'DM Mono', monospace !important; }

    /* Google Sheet panel */
    .sheet-panel { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
    .sheet-panel-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
    .sheet-panel-title { font-size: 13px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px; }
    .sheet-icon { width: 18px; height: 18px; background: #0f9d58; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: white; flex-shrink: 0; }
    .sheet-body { margin-top: 14px; }

    .sheet-sync-btn { padding: 8px 16px; background: rgba(15,157,88,0.15); border: 1px solid rgba(15,157,88,0.4); color: #0f9d58; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; font-family: 'Syne', sans-serif; white-space: nowrap; transition: all 0.15s; }
    .sheet-sync-btn:hover { background: rgba(15,157,88,0.25); }
    .sheet-hint { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; margin-top: 8px; line-height: 1.5; }
    .sheet-hint strong { color: var(--text); }
    .sheet-status-ok { color: #0f9d58; font-size: 11px; font-family: 'DM Mono', monospace; margin-top: 8px; }
    .sheet-status-err { color: var(--red); font-size: 11px; font-family: 'DM Mono', monospace; margin-top: 8px; }
    .sheet-status-loading { color: var(--muted); font-size: 11px; font-family: 'DM Mono', monospace; margin-top: 8px; }

    /* Spanning arrow */
    .funnel-wrap { position: relative; padding-bottom: 56px; }
    .span-arrow { position: absolute; bottom: 0; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
    .span-bracket { width: 100%; display: flex; align-items: flex-start; height: 36px; }
    .span-bracket-left { flex: 1; border-left: 2px dashed rgba(255,255,255,0.15); border-top: 2px dashed rgba(255,255,255,0.15); border-top-left-radius: 6px; height: 100%; }
    .span-bracket-right { flex: 1; border-right: 2px dashed rgba(255,255,255,0.15); border-top: 2px dashed rgba(255,255,255,0.15); border-top-right-radius: 6px; height: 100%; }
    .span-label { display: flex; align-items: center; gap: 8px; white-space: nowrap; padding: 0 16px; margin-top: -1px; }
    .span-arrow-icon { color: rgba(255,255,255,0.25); font-size: 14px; }
    .span-rate-pill { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; background: rgba(88,166,255,0.08); border: 1px solid rgba(88,166,255,0.25); color: var(--blue); padding: 4px 14px; border-radius: 20px; }
    .span-days { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); }
  `}</style>
);

/* ─── Heat cell color ──────────────────────────────────────────── */
const heatColor = (hours, max) => {
  if (!hours || hours === 0) return { bg: '#1e2530', text: '#3a4555' };
  const pct = Math.min(hours / max, 1);
  // 0→red, 0.5→amber, 1→green
  const r = pct < 0.5 ? 220 : Math.round(220 - (pct - 0.5) * 2 * 160);
  const g = pct < 0.5 ? Math.round(pct * 2 * 180) : 180;
  const b = 40;
  const alpha = 0.25 + pct * 0.7;
  return {
    bg: `rgba(${r},${g},${b},${alpha})`,
    text: pct > 0.25 ? '#e6edf3' : '#7d8590'
  };
};

/* ─── Main component ───────────────────────────────────────────── */
const WeeklyBillingTrends = () => {
  const BILLING_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1IwjOdgUG-gHzaQdfwxyUtIcpkDFyFKBylfHhVJvtTe0/export?format=csv&gid=413215624';
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1RIV-wZCmC3mYTqOXu7Gk6-z-pT_HcXYIL459eWp2SMo/export?format=csv&gid=0';
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [rawData, setRawData] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loadStatus, setLoadStatus] = useState({ type: 'loading', message: 'Loading billing data…' });
  const [notViableReasons, setNotViableReasons] = useState({});
  const [activeFunnelStage, setActiveFunnelStage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sheetStatus, setSheetStatus] = useState(null);
  const [showSheetPanel, setShowSheetPanel] = useState(false);

  // ── Google Sheet sync ──────────────────────────────────────────
  const syncGoogleSheet = async () => {
    setSheetStatus({ type: 'loading', message: 'Syncing not-viable reasons…' });
    try {
      const resp = await fetch(SHEET_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('Sheet has no data rows.');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('client') || h === 'name');
      const reasonIdx = headers.findIndex(h => h.includes('reason') || h.includes('viable') || h.includes('status'));
      if (nameIdx === -1) throw new Error('No "ClientName" column found.');
      const updates = {};
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const name = vals[nameIdx];
        const reason = reasonIdx >= 0 ? vals[reasonIdx] : '';
        if (name && reason) { updates[name] = reason; count++; }
      }
      setNotViableReasons(prev => ({ ...prev, ...updates }));
      setSheetStatus({ type: 'success', message: `✓ Synced ${count} reason${count !== 1 ? 's' : ''} from Google Sheet.` });
    } catch (err) {
      setSheetStatus({ type: 'error', message: `✗ ${err.message}` });
    }
  };

  // ── Auto-load billing data from Google Sheet ──────────────────
  const loadBillingSheet = async () => {
    setLoadStatus({ type: 'loading', message: 'Loading billing data…' });
    try {
      const resp = await fetch(BILLING_SHEET_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} — make sure the sheet is shared as "Anyone with the link can view."`);
      const text = await resp.text();
      // Check if we got an HTML redirect (auth wall) instead of CSV
      if (text.trim().startsWith('<!')) throw new Error('Sheet returned an HTML page — it needs to be shared as "Anyone with the link can view."');
      const parsed = parseCSV(text);
      if (parsed.length === 0) throw new Error('No valid billing rows found. Check that the sheet tab matches the expected column headers.');
      setRawData(parsed);
      setLoadStatus({ type: 'success', message: `Loaded ${parsed.length.toLocaleString()} sessions.` });
    } catch (err) {
      setLoadStatus({ type: 'error', message: err.message });
    }
  };

  // Auto-load on mount
  React.useEffect(() => { loadBillingSheet(); }, []);

  // Auto-sync not-viable reasons whenever billing data loads
  React.useEffect(() => {
    if (rawData.length > 0) syncGoogleSheet();
  }, [rawData]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.length > 0) { setRawData(parsed); setShowUpload(false); }
      else alert('No valid data found. Check your CSV.');
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const idx = (name) => headers.findIndex(h => h === name);
    const dateIdx = idx('DateOfService'), agreedIdx = idx('ClientChargesAgreedTotal'),
      unitsIdx = idx('UnitsOfService'), hoursIdx = idx('TimeWorkedInHours'),
      fnIdx = idx('ClientFirstName'), lnIdx = idx('ClientLastName'), codeIdx = idx('ProcedureCode');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]; if (!line.trim()) continue;
      const vals = []; let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
        else cur += ch;
      }
      vals.push(cur);
      const dv = vals[dateIdx]?.trim().replace(/^"|"$/g, '');
      if (!dv || dv.length < 8 || dv === 'DateOfService' || dv.includes('#')) continue;
      const fn = vals[fnIdx]?.trim().replace(/^"|"$/g, '').replace(/[^\x20-\x7E]/g, '') || '';
      const ln = vals[lnIdx]?.trim().replace(/^"|"$/g, '').replace(/[^\x20-\x7E]/g, '') || '';
      data.push({
        DateOfService: dv,
        ClientChargesAgreedTotal: parseFloat(vals[agreedIdx]?.replace(/^"|"$/g, '') || 0),
        UnitsOfService: parseFloat(vals[unitsIdx]?.replace(/^"|"$/g, '') || 0),
        TimeWorkedInHours: parseFloat(vals[hoursIdx]?.replace(/^"|"$/g, '') || 0),
        ClientName: `${fn} ${ln}`.trim(),
        ProcedureCode: vals[codeIdx]?.trim().replace(/^"|"$/g, '') || ''
      });
    }
    return data;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const p = dateStr.split(' ')[0].split('/');
      if (p.length === 3) {
        let y = parseInt(p[2]); if (y < 100) y += 2000;
        return new Date(y, parseInt(p[0]) - 1, parseInt(p[1]));
      }
    } else if (dateStr.includes('-')) {
      return new Date(dateStr.split(' ')[0]);
    }
    return new Date(dateStr);
  };

  const getWeekKey = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d); mon.setDate(diff);
    return mon.toISOString().split('T')[0];
  };

  const weeklyData = useMemo(() => {
    if (!rawData.length) return [];
    const grouped = {};
    rawData.forEach(entry => {
      const date = parseDate(entry.DateOfService);
      if (!date || isNaN(date.getTime())) return;
      const wk = getWeekKey(date);
      if (!grouped[wk]) grouped[wk] = { week: wk, agreedRevenue: 0, totalUnits: 0, totalHours: 0, sessionCount: 0, uniqueClients: new Set() };
      const charges = entry.ClientChargesAgreedTotal || 0;
      grouped[wk].agreedRevenue += charges;
      grouped[wk].totalUnits += entry.UnitsOfService || 0;
      if (charges > 0) grouped[wk].totalHours += entry.TimeWorkedInHours || 0;
      grouped[wk].sessionCount++;
      if (entry.ClientName && entry.ProcedureCode === '97153') grouped[wk].uniqueClients.add(entry.ClientName);
    });
    return Object.values(grouped)
      .map(w => ({ ...w, clientCount: w.uniqueClients.size, avgRevenuePerHour: w.totalHours > 0 ? w.agreedRevenue / w.totalHours : 0, avgSessionLength: w.sessionCount > 0 ? w.totalHours / w.sessionCount : 0, uniqueClients: undefined }))
      .sort((a, b) => new Date(a.week) - new Date(b.week))
      .map((w, i, arr) => {
        const p = arr[i - 1];
        return { ...w, revenueChange: p?.agreedRevenue > 0 ? +((w.agreedRevenue - p.agreedRevenue) / p.agreedRevenue * 100).toFixed(1) : 0, hoursChange: p?.totalHours > 0 ? +((w.totalHours - p.totalHours) / p.totalHours * 100).toFixed(1) : 0 };
      });
  }, [rawData]);

  // ── Client hours heatmap data ──────────────────────────────────
  const heatmapData = useMemo(() => {
    if (!rawData.length || !weeklyData.length) return { clients: [], weeks: [] };
    // Only last 12 weeks
    const recentWeeks = weeklyData.slice(-12).map(w => w.week);
    const clientWeekHours = {};
    rawData.forEach(entry => {
      if (entry.ProcedureCode !== '97153') return;
      const date = parseDate(entry.DateOfService);
      if (!date || isNaN(date.getTime())) return;
      const wk = getWeekKey(date);
      if (!recentWeeks.includes(wk)) return;
      const name = entry.ClientName;
      if (!name || name === ' ') return;
      const charges = entry.ClientChargesAgreedTotal || 0;
      if (!clientWeekHours[name]) clientWeekHours[name] = {};
      if (!clientWeekHours[name][wk]) clientWeekHours[name][wk] = 0;
      if (charges > 0) clientWeekHours[name][wk] += entry.TimeWorkedInHours || 0;
    });
    // Sort clients by total hours desc
    const clients = Object.entries(clientWeekHours)
      .map(([name, weeks]) => ({ name, total: Object.values(weeks).reduce((s, v) => s + v, 0), weeks }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25);
    const maxHours = Math.max(...clients.flatMap(c => Object.values(c.weeks)));
    return { clients, weeks: recentWeeks, maxHours };
  }, [rawData, weeklyData]);

  // ── WoW changes ──────────────────────────────────────────────
  const clientWoWChanges = useMemo(() => {
    if (weeklyData.length < 2) return [];
    const curr = weeklyData[weeklyData.length - 1].week;
    const prev = weeklyData[weeklyData.length - 2].week;
    const byWeek = (wk) => {
      const clients = {};
      rawData.forEach(entry => {
        if (entry.ProcedureCode !== '97153') return;
        const date = parseDate(entry.DateOfService);
        if (!date || isNaN(date.getTime())) return;
        if (getWeekKey(date) !== wk) return;
        const name = entry.ClientName; if (!name || name === ' ') return;
        const charges = entry.ClientChargesAgreedTotal || 0;
        if (!clients[name]) clients[name] = 0;
        if (charges > 0) clients[name] += entry.TimeWorkedInHours || 0;
      });
      return clients;
    };
    const c = byWeek(curr), p = byWeek(prev);
    return [...new Set([...Object.keys(c), ...Object.keys(p)])]
      .map(name => {
        const ch = c[name] || 0, ph = p[name] || 0;
        const pct = ph > 0 ? (ch - ph) / ph * 100 : (ch > 0 ? 100 : 0);
        return { name, currH: ch, prevH: ph, change: ch - ph, pct, isNew: ph === 0 && ch > 0, isGone: ph > 0 && ch === 0 };
      })
      .filter(x => x.currH > 0 || x.prevH > 0)
      .filter(x => Math.abs(x.pct) >= 25 || x.isNew || x.isGone)
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  }, [rawData, weeklyData]);

  // ── Conversion funnel ─────────────────────────────────────────
  const conversionFunnel = useMemo(() => {
    if (!rawData.length) return null;
    const PSYCH = ['90791', '96130', '96131', '96136', '96137'];
    const ASSESS = ['97151'];
    const THERAPY = ['97153'];

    const clients = {};
    rawData.forEach(entry => {
      const name = entry.ClientName; if (!name || name === ' ') return;
      if (!clients[name]) clients[name] = { name, psychDates: [], assessDates: [], therapyDates: [] };
      const date = parseDate(entry.DateOfService);
      if (!date || isNaN(date.getTime())) return;
      const code = entry.ProcedureCode;
      if (PSYCH.includes(code)) clients[name].psychDates.push(date);
      if (ASSESS.includes(code)) clients[name].assessDates.push(date);
      if (THERAPY.includes(code)) clients[name].therapyDates.push(date);
    });

    const now = new Date();
    const psychOnly = [], assessOnly = [], therapy = [], psychToAssessConverted = [], assessToTherapyConverted = [];
    let psychCount = 0, assessCount = 0, therapyCount = 0;

    Object.values(clients).forEach(c => {
      const hasPsych = c.psychDates.length > 0;
      const hasAssess = c.assessDates.length > 0;
      const hasTherapy = c.therapyDates.length > 0;

      if (hasPsych) psychCount++;
      if (hasAssess) assessCount++;
      if (hasTherapy) therapyCount++;

      const lastPsych = hasPsych ? new Date(Math.max(...c.psychDates)) : null;
      const lastAssess = hasAssess ? new Date(Math.max(...c.assessDates)) : null;
      const firstTherapy = hasTherapy ? new Date(Math.min(...c.therapyDates)) : null;
      const daysSincePsych = lastPsych ? Math.floor((now - lastPsych) / 86400000) : null;
      const daysSinceAssess = lastAssess ? Math.floor((now - lastAssess) / 86400000) : null;

      if (hasPsych && !hasAssess && !hasTherapy && daysSincePsych <= 90) {
        psychOnly.push({ ...c, lastPsych, daysSincePsych, reason: notViableReasons[c.name] || null });
      }
      if (hasAssess && !hasTherapy && daysSinceAssess !== null && daysSinceAssess <= 90) {
        assessOnly.push({ ...c, lastAssess, daysSinceAssess, daysSincePsych, reason: notViableReasons[c.name] || null });
      }
      if (hasPsych && hasAssess) {
        const daysPsychToAssess = Math.floor((new Date(Math.min(...c.assessDates)) - lastPsych) / 86400000);
        psychToAssessConverted.push({ ...c, daysPsychToAssess: Math.abs(daysPsychToAssess) });
      }
      if (hasAssess && hasTherapy) {
        const daysAssessToTherapy = Math.floor((firstTherapy - new Date(Math.min(...c.assessDates))) / 86400000);
        assessToTherapyConverted.push({ ...c, daysAssessToTherapy: Math.abs(daysAssessToTherapy), firstTherapy });
      }
    });

    const totalPsych = psychOnly.length + psychToAssessConverted.length;
    const totalAssess = assessOnly.length + assessToTherapyConverted.length;
    const psychToAssessRate = totalPsych > 0 ? (psychToAssessConverted.length / totalPsych * 100).toFixed(0) : 0;
    const assessToTherapyRate = totalAssess > 0 ? (assessToTherapyConverted.length / totalAssess * 100).toFixed(0) : 0;
    const avgDaysPsychToAssess = psychToAssessConverted.length > 0 ? Math.round(psychToAssessConverted.reduce((s, c) => s + c.daysPsychToAssess, 0) / psychToAssessConverted.length) : 0;
    const avgDaysAssessToTherapy = assessToTherapyConverted.length > 0 ? Math.round(assessToTherapyConverted.reduce((s, c) => s + c.daysAssessToTherapy, 0) / assessToTherapyConverted.length) : 0;

    return {
      stages: {
        psych: { count: psychCount, label: 'Psych Assessment', codes: '90791, 96130-96137', clients: psychOnly.sort((a, b) => a.daysSincePsych - b.daysSincePsych) },
        assess: { count: assessCount, label: 'ABA Assessment', codes: '97151', clients: assessOnly.sort((a, b) => a.daysSinceAssess - b.daysSinceAssess) },
        therapy: { count: therapyCount, label: 'ABA Therapy', codes: '97153', clients: [] },
      },
      needsAssess: { count: psychOnly.length, clients: psychOnly.sort((a, b) => a.daysSincePsych - b.daysSincePsych) },
      needsTherapy: { count: assessOnly.length, clients: assessOnly.sort((a, b) => a.daysSinceAssess - b.daysSinceAssess) },
      psychToAssessRate, assessToTherapyRate,
      avgDaysPsychToAssess, avgDaysAssessToTherapy,
      psychToAssessConverted: psychToAssessConverted.sort((a, b) => a.daysPsychToAssess - b.daysPsychToAssess).slice(0, 10),
      assessToTherapyConverted: assessToTherapyConverted.sort((a, b) => a.daysAssessToTherapy - b.daysAssessToTherapy).slice(0, 10),
    };
  }, [rawData, notViableReasons]);

  const latestWeek = weeklyData[weeklyData.length - 1] || {};
  const prevWeek = weeklyData[weeklyData.length - 2] || {};
  const fmt$ = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  const fmtShort = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const exportCSV = () => {
    setIsExporting(true);
    const rows = [
      ['Name', 'Stage', 'Days Since Last Service', 'Not Viable Reason'].join(','),
      ...(conversionFunnel?.needsAssess?.clients || []).map(c => [c.name, 'Needs ABA Assessment', c.daysSincePsych, c.reason || ''].join(',')),
      ...(conversionFunnel?.needsTherapy?.clients || []).map(c => [c.name, 'Needs ABA Therapy', c.daysSinceAssess, c.reason || ''].join(','))
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `aba-conversion-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  /* ── Loading / Error / Upload fallback screen ─────────────── */
  if (rawData.length === 0) return (
    <div className="upload-screen">
      <FontLoader />
      <div className="upload-card">
        <h2>Billing & Clinical Pipeline</h2>

        {loadStatus.type === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{loadStatus.message}</p>
          </div>
        )}

        {loadStatus.type === 'error' && (
          <div>
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(240,112,112,0.3)', borderRadius: 8, padding: '14px 16px', marginBottom: 24 }}>
              <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Could not load billing sheet</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'DM Mono', lineHeight: 1.6 }}>{loadStatus.message}</div>
            </div>
            <button className="sheet-sync-btn" style={{ width: '100%', marginBottom: 20, padding: '10px', justifyContent: 'center', display: 'flex' }} onClick={loadBillingSheet}>
              ↻ Retry Auto-Load
            </button>
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>— or upload a CSV manually —</div>
            <label className="upload-zone">
              <input type="file" accept=".csv" onChange={handleFileUpload} />
              <div className="upload-icon">↑</div>
              <div className="upload-zone-text">Upload billing CSV</div>
              <div className="upload-zone-sub">File → Download → Comma-separated values (.csv)</div>
            </label>
          </div>
        )}

        {loadStatus.type === 'success' && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Data loaded — rendering dashboard…</p>
        )}
      </div>
    </div>
  );

  /* ── Active stage detail ───────────────────────────────────── */
  const renderFunnelDetail = () => {
    if (!activeFunnelStage || !conversionFunnel) return null;
    let clients = [], title = '', emptyMsg = '';

    if (activeFunnelStage === 'needsAssess') {
      clients = conversionFunnel.needsAssess.clients; title = `Needs ABA Assessment (${clients.length})`; emptyMsg = 'All psych clients have started assessment!';
    } else if (activeFunnelStage === 'needsTherapy') {
      clients = conversionFunnel.needsTherapy.clients; title = `Needs ABA Therapy (${clients.length})`; emptyMsg = 'All assessed clients have started therapy!';
    } else if (activeFunnelStage === 'converted12') {
      clients = conversionFunnel.psychToAssessConverted; title = `Psych → Assessment Conversions (${clients.length})`; emptyMsg = 'No conversions yet.';
    } else if (activeFunnelStage === 'converted23') {
      clients = conversionFunnel.assessToTherapyConverted; title = `Assessment → Therapy Conversions (${clients.length})`; emptyMsg = 'No conversions yet.';
    }

    return (
      <div className="card" style={{ marginTop: 0, borderColor: 'rgba(0,212,170,0.3)' }}>
        <div className="card-title" style={{ marginBottom: 16 }}>{title}</div>
        <div className="client-scroll">
          {clients.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>{emptyMsg}</p> : clients.map((c, i) => {
            const days = c.daysSincePsych ?? c.daysSinceAssess ?? c.daysPsychToAssess ?? c.daysAssessToTherapy ?? 0;
            const badge = days > 60 ? 'badge-red' : days > 30 ? 'badge-amber' : 'badge-green';
            const badgeLabel = activeFunnelStage.startsWith('converted') ? `${days}d conversion` : `${days}d ago`;
            return (
              <div key={i} className="funnel-client-row">
                <div>
                  <div className="fcr-name">{c.name}</div>
                  <div className="fcr-meta">
                    {activeFunnelStage === 'needsAssess' && `Last psych: ${c.lastPsych?.toLocaleDateString()} • ${c.psychDates?.length || 0} sessions`}
                    {activeFunnelStage === 'needsTherapy' && `Last assess: ${c.lastAssess?.toLocaleDateString()} • ${c.assessDates?.length || 0} sessions`}
                    {activeFunnelStage === 'converted12' && `Psych→Assess in ${days} days`}
                    {activeFunnelStage === 'converted23' && `Assess→Therapy in ${days} days • started ${c.firstTherapy?.toLocaleDateString()}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {(activeFunnelStage === 'needsAssess' || activeFunnelStage === 'needsTherapy') && (
                    <select className="not-viable-select" value={notViableReasons[c.name] || ''} onChange={e => setNotViableReasons(p => ({ ...p, [c.name]: e.target.value || null }))}>
                      <option value="">Active Lead</option>
                      <option value="Insurance">Insurance</option>
                      <option value="No Response">No Response</option>
                      <option value="Competitor">Competitor</option>
                      <option value="Center Based">Center Based</option>
                      <option value="Financial">Financial</option>
                      <option value="Service Area">Service Area</option>
                      <option value="Age">Age</option>
                    </select>
                  )}
                  <span className={`fcr-badge ${notViableReasons[c.name] ? 'badge-gray' : badge}`}>{notViableReasons[c.name] || badgeLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Main dashboard ────────────────────────────────────────── */
  return (
    <div className="dash">
      <FontLoader />
      {/* Header */}
      <div className="header">
        <div>
          <h1>Billing & Clinical Pipeline</h1>
          <div className="header-sub mono">
            {rawData.length.toLocaleString()} sessions · {weeklyData.length} weeks · data thru {weeklyData.length > 0 ? fmtDate(weeklyData[weeklyData.length - 1].week) : '—'}
            {loadStatus.type === 'loading' && <span style={{ color: 'var(--amber)', marginLeft: 12 }}>⟳ refreshing…</span>}
            {loadStatus.type === 'error' && <span style={{ color: 'var(--red)', marginLeft: 12, cursor: 'pointer' }} onClick={loadBillingSheet} title={loadStatus.message}>⚠ load error — click to retry</span>}
          </div>
        </div>
        <button className="upload-btn" onClick={loadBillingSheet}>
          <Upload size={14} /> Refresh Data
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { label: 'Agreed Charges', val: fmt$(latestWeek.agreedRevenue || 0), chg: latestWeek.revenueChange || 0, color: 'teal' },
          { label: 'Billable Hours', val: `${(latestWeek.totalHours || 0).toFixed(1)}h`, chg: latestWeek.hoursChange || 0, color: 'blue' },
          { label: 'Active Clients', val: latestWeek.clientCount || 0, chg: prevWeek.clientCount > 0 ? +((latestWeek.clientCount - prevWeek.clientCount) / prevWeek.clientCount * 100).toFixed(1) : 0, color: 'amber' },
          { label: '$/Hour', val: fmt$(latestWeek.avgRevenuePerHour || 0), chg: prevWeek.avgRevenuePerHour > 0 ? +((latestWeek.avgRevenuePerHour - prevWeek.avgRevenuePerHour) / prevWeek.avgRevenuePerHour * 100).toFixed(1) : 0, color: 'green' },
        ].map(({ label, val, chg, color }) => (
          <div key={label} className={`kpi-card ${color}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
            <div className={`kpi-change ${chg >= 0 ? 'up' : 'down'}`}>
              {chg >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(chg)}% <span className="kpi-vs">vs last week</span>
            </div>
          </div>
        ))}
      </div>

      {/* Metric tabs + trend chart */}
      <div className="card">
        <div className="metric-tabs">
          {[['revenue', 'Agreed Charges'], ['hours', 'Hours'], ['clients', 'Active Clients'], ['sessions', 'Sessions']].map(([k, label]) => (
            <button key={k} className={`tab ${selectedMetric === k ? 'active' : ''}`} onClick={() => setSelectedMetric(k)}>{label}</button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={weeklyData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3140" />
            <XAxis dataKey="week" tickFormatter={fmtShort} stroke="#4a5568" tick={{ fill: '#7d8590', fontSize: 11, fontFamily: 'DM Mono' }} />
            <YAxis stroke="#4a5568" tick={{ fill: '#7d8590', fontSize: 11, fontFamily: 'DM Mono' }} />
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #2a3140', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} labelStyle={{ color: '#e6edf3' }} itemStyle={{ color: '#00d4aa' }} labelFormatter={fmtDate} formatter={v => selectedMetric === 'revenue' ? fmt$(v) : selectedMetric === 'hours' ? `${v.toFixed(1)}h` : v} />
            {selectedMetric === 'revenue' && <Line type="monotone" dataKey="agreedRevenue" stroke="#00d4aa" strokeWidth={2} dot={{ fill: '#00d4aa', r: 3 }} name="Agreed Charges" />}
            {selectedMetric === 'hours' && <Line type="monotone" dataKey="totalHours" stroke="#58a6ff" strokeWidth={2} dot={{ fill: '#58a6ff', r: 3 }} name="Total Hours" />}
            {selectedMetric === 'clients' && <Line type="monotone" dataKey="clientCount" stroke="#f0a832" strokeWidth={2} dot={{ fill: '#f0a832', r: 3 }} name="Active Clients" />}
            {selectedMetric === 'sessions' && <Line type="monotone" dataKey="sessionCount" stroke="#56d364" strokeWidth={2} dot={{ fill: '#56d364', r: 3 }} name="Sessions" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two-col: heatmap + WoW changes */}
      <div className="two-col">
        {/* Client Hours Heatmap */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">Client Hours Heatmap (97153)</div>
          <div className="card-sub">Weekly billable hours per client — last 12 weeks</div>
          <div className="heatmap-wrap">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th className="name-col">Client</th>
                  {heatmapData.weeks.map(w => <th key={w}>{fmtShort(w)}</th>)}
                  <th className="total-col">Total</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.clients.map(client => (
                  <tr key={client.name}>
                    <td className="name-cell" title={client.name}>{client.name}</td>
                    {heatmapData.weeks.map(wk => {
                      const h = client.weeks[wk] || 0;
                      const { bg, text } = heatColor(h, heatmapData.maxHours);
                      return (
                        <td key={wk}>
                          <div className="heat-cell" style={{ background: bg, color: text }} title={`${client.name} — ${fmtShort(wk)}: ${h.toFixed(1)}h`}>
                            {h > 0 ? h.toFixed(1) : ''}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ color: 'var(--teal)', fontFamily: 'DM Mono', fontSize: 12, textAlign: 'center' }}>{client.total.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hm-legend">
            <span className="hm-legend-label">0h</span>
            <div className="hm-legend-boxes">
              {[0.05, 0.2, 0.4, 0.6, 0.8, 1.0].map(p => {
                const { bg } = heatColor(p * heatmapData.maxHours, heatmapData.maxHours);
                return <div key={p} className="hm-legend-box" style={{ background: bg }} />;
              })}
            </div>
            <span className="hm-legend-label">{heatmapData.maxHours.toFixed(0)}h</span>
          </div>
        </div>
      </div>

      {/* WoW changes */}
      <div className="card">
        <div className="card-title">Client Hour Changes — Week over Week (97153)</div>
        <div className="card-sub">Clients with ≥25% change in billable hours</div>
        {clientWoWChanges.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No significant changes this week.</p>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {clientWoWChanges.slice(0, 12).map((c, i) => (
                <div key={i} className="wow-row">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div className="wow-hours">{c.prevH.toFixed(1)}h → {c.currH.toFixed(1)}h ({c.change > 0 ? '+' : ''}{c.change.toFixed(1)}h)</div>
                  </div>
                  <span className={`fcr-badge ${c.isNew ? 'badge-green' : c.isGone ? 'badge-red' : c.change > 0 ? 'badge-blue' : 'badge-amber'}`}>
                    {c.isNew ? 'NEW' : c.isGone ? 'INACTIVE' : `${c.pct > 0 ? '+' : ''}${c.pct.toFixed(0)}%`}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* ── Conversion Funnel ─────────────────────────────────── */}
      {conversionFunnel && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="card-title" style={{ fontSize: 18 }}>Clinical Conversion Pipeline</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Mono', marginTop: 4 }}>Psych Assessment → ABA Assessment (97151) → ABA Therapy (97153)</div>
            </div>
            <button className="export-btn" onClick={exportCSV} disabled={isExporting}>
              <Download size={13} /> {isExporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>

          {/* Google Sheet sync panel */}
          <div className="sheet-panel">
            <div className="sheet-panel-header" onClick={() => setShowSheetPanel(p => !p)}>
              <div className="sheet-panel-title">
                <div className="sheet-icon">G</div>
                Sync Not-Viable Reasons from Google Sheet
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono', marginLeft: 4 }}>
                  {Object.keys(notViableReasons).filter(k => notViableReasons[k]).length > 0
                    ? `(${Object.keys(notViableReasons).filter(k => notViableReasons[k]).length} reasons loaded)`
                    : '(none loaded)'}
                </span>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'DM Mono' }}>{showSheetPanel ? '▲' : '▼'}</span>
            </div>
            {showSheetPanel && (
              <div className="sheet-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Mono', lineHeight: 1.6 }}>
                    Auto-syncing from{' '}
                    <a
                      href="https://docs.google.com/spreadsheets/d/1RIV-wZCmC3mYTqOXu7Gk6-z-pT_HcXYIL459eWp2SMo/edit"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--teal)', textDecoration: 'underline' }}
                    >
                      Not-Viable Reasons Sheet ↗
                    </a>
                    {'. '}Columns used: <strong style={{ color: 'var(--text)' }}>ClientName</strong>,{' '}
                    <strong style={{ color: 'var(--text)' }}>NotViableReason</strong>.
                    Syncs automatically each time you load billing data.
                  </div>
                  <button className="sheet-sync-btn" onClick={syncGoogleSheet} disabled={sheetStatus?.type === 'loading'} style={{ flexShrink: 0 }}>
                    {sheetStatus?.type === 'loading' ? 'Syncing…' : '↻ Re-sync'}
                  </button>
                </div>
                {sheetStatus && (
                  <div className={
                    sheetStatus.type === 'success' ? 'sheet-status-ok' :
                    sheetStatus.type === 'error' ? 'sheet-status-err' : 'sheet-status-loading'
                  }>{sheetStatus.message}</div>
                )}
              </div>
            )}
          </div>

          {/* Funnel stages + spanning arrow */}
          <div className="funnel-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 0, alignItems: 'center' }}>
              {/* Stage 1 */}
              <div className={`funnel-stage ${activeFunnelStage === 'needsAssess' ? 'active' : ''}`} onClick={() => setActiveFunnelStage(prev => prev === 'needsAssess' ? null : 'needsAssess')}>
                <div className="stage-header">
                  <span className="stage-code">90791, 96130–96137</span>
                  <span className="fcr-badge badge-blue">{conversionFunnel.stages.psych.count} clients</span>
                </div>
                <div className="stage-name">Psych Assessment</div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span className="stage-count psych">{conversionFunnel.needsAssess.count}</span>
                    <div className="stage-meta">awaiting 97151</div>
                  </div>
                  <button style={{ fontSize: 11, color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid rgba(88,166,255,0.3)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Mono' }} onClick={e => { e.stopPropagation(); setActiveFunnelStage(p => p === 'converted12' ? null : 'converted12'); }}>
                    {conversionFunnel.psychToAssessConverted.length} converted ↓
                  </button>
                </div>
              </div>

              {/* Arrow 1→2 */}
              <div className="funnel-connector" style={{ flexDirection: 'column', padding: '0 12px' }}>
                <ChevronRight size={20} color="var(--muted)" />
                <div className="conv-rate">{conversionFunnel.psychToAssessRate}%</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono', marginTop: 4 }}>avg {conversionFunnel.avgDaysPsychToAssess}d</div>
              </div>

              {/* Stage 2 */}
              <div className={`funnel-stage ${activeFunnelStage === 'needsTherapy' ? 'active' : ''}`} onClick={() => setActiveFunnelStage(prev => prev === 'needsTherapy' ? null : 'needsTherapy')}>
                <div className="stage-header">
                  <span className="stage-code">97151</span>
                  <span className="fcr-badge badge-amber">{conversionFunnel.stages.assess.count} clients</span>
                </div>
                <div className="stage-name">ABA Assessment</div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span className="stage-count assess">{conversionFunnel.needsTherapy.count}</span>
                    <div className="stage-meta">awaiting 97153</div>
                  </div>
                  <button style={{ fontSize: 11, color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid rgba(240,168,50,0.3)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Mono' }} onClick={e => { e.stopPropagation(); setActiveFunnelStage(p => p === 'converted23' ? null : 'converted23'); }}>
                    {conversionFunnel.assessToTherapyConverted.length} converted ↓
                  </button>
                </div>
              </div>

              {/* Arrow 2→3 */}
              <div className="funnel-connector" style={{ flexDirection: 'column', padding: '0 12px' }}>
                <ChevronRight size={20} color="var(--muted)" />
                <div className="conv-rate">{conversionFunnel.assessToTherapyRate}%</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'DM Mono', marginTop: 4 }}>avg {conversionFunnel.avgDaysAssessToTherapy}d</div>
              </div>

              {/* Stage 3 */}
              <div className="funnel-stage" style={{ cursor: 'default' }}>
                <div className="stage-header">
                  <span className="stage-code">97153</span>
                  <span className="fcr-badge badge-green">{conversionFunnel.stages.therapy.count} clients</span>
                </div>
                <div className="stage-name">ABA Therapy</div>
                <div style={{ marginTop: 8 }}>
                  <span className="stage-count therapy">{conversionFunnel.stages.therapy.count}</span>
                  <div className="stage-meta">active in therapy</div>
                </div>
              </div>
            </div>

            {/* Spanning arrow: Psych → Therapy overall rate */}
            {(() => {
              const totalPsychClients = conversionFunnel.stages.psych.count;
              const therapyClients = conversionFunnel.stages.therapy.count;
              const overallRate = totalPsychClients > 0 ? Math.round(therapyClients / totalPsychClients * 100) : 0;
              const avgTotal = conversionFunnel.avgDaysPsychToAssess + conversionFunnel.avgDaysAssessToTherapy;
              return (
                <div className="span-arrow">
                  <div className="span-bracket">
                    <div className="span-bracket-left" />
                    <div className="span-label">
                      <span className="span-arrow-icon">↕</span>
                      <span className="span-rate-pill">
                        {overallRate}% overall · Psych → Therapy
                      </span>
                      <span className="span-days">avg {avgTotal}d end-to-end</span>
                    </div>
                    <div className="span-bracket-right" />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Detail panel */}
          {renderFunnelDetail()}
        </div>
      )}

      {/* Weekly table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 24 }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="card-title">Weekly Summary</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Sessions</th>
                <th>Clients</th>
                <th>Agreed Charges</th>
                <th>Hours</th>
                <th>$/Hour</th>
                <th>Avg Hrs/Session</th>
              </tr>
            </thead>
            <tbody>
              {[...weeklyData].reverse().map((w, i) => (
                <tr key={i}>
                  <td>{fmtDate(w.week)}</td>
                  <td>{w.sessionCount}</td>
                  <td>{w.clientCount}</td>
                  <td>{fmt$(w.agreedRevenue)}</td>
                  <td>{w.totalHours.toFixed(1)}h</td>
                  <td>{fmt$(w.avgRevenuePerHour)}</td>
                  <td>{w.avgSessionLength.toFixed(2)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WeeklyBillingTrends;
