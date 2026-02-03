import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, Upload, Download } from 'lucide-react';

const WeeklyBillingTrends = () => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [rawData, setRawData] = useState([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [notViableReasons, setNotViableReasons] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [clientNotes, setClientNotes] = useState({});

  // Auto-load CSV from hardcoded Google Sheet URL
  React.useEffect(() => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/1IwjOdgUG-gHzaQdfwxyUtIcpkDFyFKBylfHhVJvtTe0/export?format=csv';
    
    fetch(csvUrl)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch CSV');
        return response.text();
      })
      .then(text => {
        const parsed = parseCSVData(text);
        if (parsed.length > 0) {
          setRawData(parsed);
          setShowInstructions(false);
        } else {
          alert('No valid data found in the CSV file.');
        }
      })
      .catch(error => {
        console.error('Error loading CSV from Google Sheets:', error);
        alert('Failed to load CSV from Google Sheets. Make sure the sheet is publicly shared.');
      });
  }, []);

  const handleNotViableChange = (clientName, reason) => {
    setNotViableReasons(prev => ({
      ...prev,
      [clientName]: reason
    }));
  };

  const exportToHubSpot = async () => {
    setIsExporting(true);
    setExportStatus(null);
    
    try {
      // Get conversion data with not viable reasons
      const exportData = psychToABAConversion.needsConversion?.map(client => {
        const [firstName, ...lastNameParts] = client.name.split(' ');
        const lastName = lastNameParts.join(' ');
        
        return {
          firstName,
          lastName,
          lastPsychDate: client.lastPsychDate?.toISOString().split('T')[0],
          daysSincePsych: client.daysSincePsych,
          psychSessions: client.psychSessions,
          notViableReason: client.notViableReason || 'Active Lead',
          status: client.notViableReason ? 'Not Viable' : 'Active Conversion Lead'
        };
      }) || [];
      
      // Create CSV export as fallback
      const csvContent = [
        ['First Name', 'Last Name', 'Last Psych Date', 'Days Since Psych', 'Psych Sessions', 'Status', 'Not Viable Reason'].join(','),
        ...exportData.map(row => [
          row.firstName,
          row.lastName,
          row.lastPsychDate,
          row.daysSincePsych,
          row.psychSessions,
          row.status,
          row.notViableReason
        ].join(','))
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `psych-to-aba-conversion-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setExportStatus({
        type: 'success',
        message: `Exported ${exportData.length} conversion leads to CSV. To sync to HubSpot, enable CRM object management at: Settings > Product Updates > New to You`
      });
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: `Export failed: ${error.message}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSVData(text);
      if (parsed.length > 0) {
        setRawData(parsed);
        setShowInstructions(false);
      } else {
        alert('No valid data found. Please check your CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const parseCSVData = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    
    const dateIdx = headers.findIndex(h => h === 'DateOfService');
    const agreedIdx = headers.findIndex(h => h === 'ClientChargesAgreedTotal');
    const unitsIdx = headers.findIndex(h => h === 'UnitsOfService');
    const hoursIdx = headers.findIndex(h => h === 'TimeWorkedInHours');
    const clientFirstIdx = headers.findIndex(h => h === 'ClientFirstName');
    const clientLastIdx = headers.findIndex(h => h === 'ClientLastName');
    const procedureCodeIdx = headers.findIndex(h => h === 'ProcedureCode');
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      
      const dateValue = values[dateIdx]?.trim().replace(/^"|"$/g, '');
      if (!dateValue || dateValue.length < 8 || dateValue === 'DateOfService' || dateValue.includes('#')) continue;
      
      const firstName = values[clientFirstIdx]?.trim().replace(/^"|"$/g, '') || '';
      const lastName = values[clientLastIdx]?.trim().replace(/^"|"$/g, '') || '';
      const procedureCode = values[procedureCodeIdx]?.trim().replace(/^"|"$/g, '') || '';
      
      const row = {
        DateOfService: dateValue,
        ClientChargesAgreedTotal: parseFloat(values[agreedIdx]?.replace(/^"|"$/g, '') || 0),
        UnitsOfService: parseFloat(values[unitsIdx]?.replace(/^"|"$/g, '') || 0),
        TimeWorkedInHours: parseFloat(values[hoursIdx]?.replace(/^"|"$/g, '') || 0),
        ClientName: `${firstName} ${lastName}`.trim(),
        ProcedureCode: procedureCode
      };
      
      data.push(row);
    }
    
    return data;
  };

  const weeklyData = useMemo(() => {
    if (rawData.length === 0) return [];
    
    const grouped = {};
    
    rawData.forEach(entry => {
      let date;
      const dateStr = entry.DateOfService;
      
      // Handle various date formats
      if (dateStr.includes('/')) {
        // Format: MM/DD/YYYY or MM/DD/YYYY HH:MM:SS
        const datePart = dateStr.split(' ')[0]; // Get just the date part before any time
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          let year = parseInt(parts[2]);
          
          // Fix 2-digit years
          if (year < 100) {
            year += 2000;
          }
          
          date = new Date(year, month, day);
        }
      } else if (dateStr.includes('-')) {
        // Format: YYYY-MM-DD or similar
        const datePart = dateStr.split(' ')[0];
        date = new Date(datePart);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return;
      
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = {
          week: weekKey,
          agreedRevenue: 0,
          totalUnits: 0,
          totalHours: 0,
          sessionCount: 0,
          uniqueClients: new Set()
        };
      }
      
      const agreedCharges = entry.ClientChargesAgreedTotal || 0;
      const hours = entry.TimeWorkedInHours || 0;
      
      grouped[weekKey].agreedRevenue += agreedCharges;
      grouped[weekKey].totalUnits += entry.UnitsOfService || 0;
      
      // Only count hours if there are agreed charges
      if (agreedCharges > 0) {
        grouped[weekKey].totalHours += hours;
      }
      
      grouped[weekKey].sessionCount += 1;
      
      // Only count as unique client if procedure code is 97153
      if (entry.ClientName && entry.ProcedureCode === '97153') {
        grouped[weekKey].uniqueClients.add(entry.ClientName);
      }
    });
    
    return Object.values(grouped)
      .map(week => ({
        ...week,
        avgSessionLength: week.totalHours / week.sessionCount,
        avgRevenuePerHour: week.agreedRevenue / week.totalHours,
        clientCount: week.uniqueClients.size,
        uniqueClients: undefined // Remove Set from data
      }))
      .sort((a, b) => new Date(a.week) - new Date(b.week))
      .map((week, idx, arr) => {
        if (idx > 0) {
          const prevWeek = arr[idx - 1];
          week.revenueChange = prevWeek.agreedRevenue > 0 
            ? ((week.agreedRevenue - prevWeek.agreedRevenue) / prevWeek.agreedRevenue * 100).toFixed(1) 
            : 0;
          week.hoursChange = prevWeek.totalHours > 0
            ? ((week.totalHours - prevWeek.totalHours) / prevWeek.totalHours * 100).toFixed(1)
            : 0;
        } else {
          week.revenueChange = 0;
          week.hoursChange = 0;
        }
        return week;
      });
  }, [rawData]);

  // Client analysis for latest week - ONLY 97153
  const latestWeekClients = useMemo(() => {
    if (rawData.length === 0 || weeklyData.length === 0) return [];
    
    const latestWeekKey = weeklyData[weeklyData.length - 1].week;
    
    console.log('Latest week key:', latestWeekKey);
    console.log('Looking for 97153 clients in week of:', latestWeekKey);
    
    const clients = {};
    
    rawData.forEach(entry => {
      // Skip non-97153 codes
      if (entry.ProcedureCode !== '97153') return;
      
      let date;
      const dateStr = entry.DateOfService;
      
      if (dateStr.includes('/')) {
        const datePart = dateStr.split(' ')[0];
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          let year = parseInt(parts[2]);
          if (year < 100) year += 2000;
          date = new Date(year, month, day);
        }
      } else if (dateStr.includes('-')) {
        const datePart = dateStr.split(' ')[0];
        date = new Date(datePart);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return;
      
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      
      // Compare week start dates
      if (monday.toISOString().split('T')[0] !== latestWeekKey) return;
      
      const name = entry.ClientName;
      if (!name || name === ' ') return;
      
      const agreedCharges = entry.ClientChargesAgreedTotal || 0;
      const hours = entry.TimeWorkedInHours || 0;
      
      if (!clients[name]) {
        clients[name] = {
          name,
          totalRevenue: 0,
          totalHours: 0,
          sessionCount: 0
        };
      }
      
      clients[name].totalRevenue += agreedCharges;
      if (agreedCharges > 0) {
        clients[name].totalHours += hours;
      }
      clients[name].sessionCount += 1;
    });
    
    console.log('Latest week 97153 clients found:', Object.keys(clients).length);
    
    return Object.values(clients)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [rawData, weeklyData]);

  // Client week-over-week analysis - ONLY 97153
  const clientWoWChanges = useMemo(() => {
    if (rawData.length === 0 || weeklyData.length < 2) return [];
    
    const latestWeekKey = weeklyData[weeklyData.length - 1].week;
    const previousWeekKey = weeklyData[weeklyData.length - 2].week;
    
    console.log('Comparing weeks for 97153:', previousWeekKey, 'vs', latestWeekKey);
    
    const parseAndGroupByWeek = (targetWeekKey) => {
      const clients = {};
      
      rawData.forEach(entry => {
        // Skip non-97153 codes
        if (entry.ProcedureCode !== '97153') return;
        
        let date;
        const dateStr = entry.DateOfService;
        
        if (dateStr.includes('/')) {
          const datePart = dateStr.split(' ')[0];
          const parts = datePart.split('/');
          if (parts.length === 3) {
            const month = parseInt(parts[0]) - 1;
            const day = parseInt(parts[1]);
            let year = parseInt(parts[2]);
            if (year < 100) year += 2000;
            date = new Date(year, month, day);
          }
        } else if (dateStr.includes('-')) {
          const datePart = dateStr.split(' ')[0];
          date = new Date(datePart);
        } else {
          date = new Date(dateStr);
        }
        
        if (isNaN(date.getTime())) return;
        
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diff);
        const weekKey = monday.toISOString().split('T')[0];
        
        if (weekKey !== targetWeekKey) return;
        
        const name = entry.ClientName;
        if (!name || name === ' ') return;
        
        const agreedCharges = entry.ClientChargesAgreedTotal || 0;
        const hours = entry.TimeWorkedInHours || 0;
        
        if (!clients[name]) {
          clients[name] = { hours: 0 };
        }
        
        if (agreedCharges > 0) {
          clients[name].hours += hours;
        }
      });
      
      return clients;
    };
    
    const latestWeekClients = parseAndGroupByWeek(latestWeekKey);
    const previousWeekClients = parseAndGroupByWeek(previousWeekKey);
    
    console.log('Latest week 97153 client count:', Object.keys(latestWeekClients).length);
    console.log('Previous week 97153 client count:', Object.keys(previousWeekClients).length);
    
    const allClientNames = new Set([
      ...Object.keys(latestWeekClients),
      ...Object.keys(previousWeekClients)
    ]);
    
    const changes = [];
    allClientNames.forEach(name => {
      const latestHours = latestWeekClients[name]?.hours || 0;
      const previousHours = previousWeekClients[name]?.hours || 0;
      
      if (latestHours === 0 && previousHours === 0) return;
      
      const change = latestHours - previousHours;
      const percentChange = previousHours > 0 
        ? ((change / previousHours) * 100)
        : (latestHours > 0 ? 100 : 0);
      
      changes.push({
        name,
        latestHours,
        previousHours,
        change,
        percentChange,
        isNew: previousHours === 0 && latestHours > 0,
        isGone: previousHours > 0 && latestHours === 0
      });
    });
    
    const filtered = changes
      .filter(c => Math.abs(c.percentChange) >= 25 || c.isNew || c.isGone)
      .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
    
    console.log('97153 client changes found:', filtered.length);
    
    return filtered;
  }, [rawData, weeklyData]);

  const latestWeek = weeklyData[weeklyData.length - 1] || {};
  const previousWeek = weeklyData[weeklyData.length - 2] || {};

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Comprehensive Psych Dashboard Analytics
  const psychDashboardData = useMemo(() => {
    if (rawData.length === 0) return null;
    
    const psychCodes = ['90791', '96130', '96131', '96136', '96137'];
    const abaCodes = ['97155', '97153'];
    const allCodes = [...psychCodes, ...abaCodes];
    
    // Track complete client journey
    const clientJourneys = {};
    
    rawData.forEach(entry => {
      const name = entry.ClientName;
      if (!name || name === ' ') return;
      
      const code = entry.ProcedureCode;
      if (!allCodes.includes(code)) return;
      
      // Parse date
      let date;
      const dateStr = entry.DateOfService;
      if (dateStr.includes('/')) {
        const datePart = dateStr.split(' ')[0];
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          let year = parseInt(parts[2]);
          if (year < 100) year += 2000;
          date = new Date(year, month, day);
        }
      } else if (dateStr.includes('-')) {
        const datePart = dateStr.split(' ')[0];
        date = new Date(datePart);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return;
      
      if (!clientJourneys[name]) {
        clientJourneys[name] = {
          name,
          firstPsychDate: null,
          lastPsychDate: null,
          firstABADate: null,
          lastABADate: null,
          psychSessions: 0,
          abaSessions: 0,
          psychCodes: [],
          status: 'unknown',
          daysSinceFirstPsych: 0,
          daysSinceLastPsych: 0,
          daysToConversion: null,
          totalRevenue: 0,
          totalHours: 0
        };
      }
      
      const journey = clientJourneys[name];
      
      // Track psych assessments
      if (psychCodes.includes(code)) {
        journey.psychSessions += 1;
        if (!journey.psychCodes.includes(code)) {
          journey.psychCodes.push(code);
        }
        if (!journey.firstPsychDate || date < journey.firstPsychDate) {
          journey.firstPsychDate = date;
        }
        if (!journey.lastPsychDate || date > journey.lastPsychDate) {
          journey.lastPsychDate = date;
        }
      }
      
      // Track ABA services
      if (abaCodes.includes(code)) {
        journey.abaSessions += 1;
        if (!journey.firstABADate || date < journey.firstABADate) {
          journey.firstABADate = date;
        }
        if (!journey.lastABADate || date > journey.lastABADate) {
          journey.lastABADate = date;
        }
      }
      
      // Track revenue and hours
      journey.totalRevenue += entry.ClientChargesAgreedTotal || 0;
      journey.totalHours += entry.TimeWorkedInHours || 0;
    });
    
    // Calculate metrics and categorize clients
    const now = new Date();
    const activeLeads = [];
    const converted = [];
    const atRisk = [];
    const notViable = [];
    
    Object.values(clientJourneys).forEach(journey => {
      if (!journey.firstPsychDate) return;
      
      journey.daysSinceFirstPsych = Math.floor((now - journey.firstPsychDate) / (1000 * 60 * 60 * 24));
      journey.daysSinceLastPsych = Math.floor((now - journey.lastPsychDate) / (1000 * 60 * 60 * 24));
      
      // Get notes and not viable reason
      journey.notes = clientNotes[journey.name] || '';
      journey.notViableReason = notViableReasons[journey.name] || null;
      
      if (journey.firstABADate) {
        // Converted
        journey.daysToConversion = Math.floor((journey.firstABADate - journey.lastPsychDate) / (1000 * 60 * 60 * 24));
        journey.status = 'converted';
        converted.push(journey);
      } else if (journey.notViableReason) {
        // Marked as not viable
        journey.status = 'not-viable';
        notViable.push(journey);
      } else if (journey.daysSinceLastPsych <= 75) {
        // Active in pipeline
        if (journey.daysSinceLastPsych > 45) {
          journey.status = 'at-risk';
          atRisk.push(journey);
        } else {
          journey.status = 'active';
          activeLeads.push(journey);
        }
      } else {
        // Old lead - consider stale
        journey.status = 'stale';
      }
    });
    
    // Sort arrays
    activeLeads.sort((a, b) => a.daysSinceLastPsych - b.daysSinceLastPsych);
    atRisk.sort((a, b) => b.daysSinceLastPsych - a.daysSinceLastPsych);
    converted.sort((a, b) => b.firstABADate - a.firstABADate);
    notViable.sort((a, b) => a.daysSinceLastPsych - b.daysSinceLastPsych);
    
    // Calculate conversion metrics
    const totalWithPsych = activeLeads.length + atRisk.length + converted.length + notViable.length;
    const conversionRate = totalWithPsych > 0 ? ((converted.length / totalWithPsych) * 100).toFixed(1) : 0;
    
    // Calculate average days to conversion
    const validConversions = converted.filter(c => c.daysToConversion >= 0);
    const avgDaysToConversion = validConversions.length > 0
      ? (validConversions.reduce((sum, c) => sum + c.daysToConversion, 0) / validConversions.length).toFixed(1)
      : 0;
    
    // Time-based cohort analysis
    const cohorts = {
      '0-14': { active: 0, converted: 0, atRisk: 0, notViable: 0 },
      '15-30': { active: 0, converted: 0, atRisk: 0, notViable: 0 },
      '31-45': { active: 0, converted: 0, atRisk: 0, notViable: 0 },
      '46-60': { active: 0, converted: 0, atRisk: 0, notViable: 0 },
      '61-75': { active: 0, converted: 0, atRisk: 0, notViable: 0 }
    };
    
    [...activeLeads, ...atRisk, ...notViable].forEach(journey => {
      const days = journey.daysSinceLastPsych;
      let cohort;
      if (days <= 14) cohort = '0-14';
      else if (days <= 30) cohort = '15-30';
      else if (days <= 45) cohort = '31-45';
      else if (days <= 60) cohort = '46-60';
      else cohort = '61-75';
      
      if (journey.status === 'active') cohorts[cohort].active++;
      else if (journey.status === 'at-risk') cohorts[cohort].atRisk++;
      else if (journey.status === 'not-viable') cohorts[cohort].notViable++;
    });
    
    return {
      activeLeads,
      atRisk,
      converted: converted.slice(0, 20),
      notViable,
      totalWithPsych,
      conversionRate,
      avgDaysToConversion,
      cohorts,
      allClients: Object.values(clientJourneys)
    };
  }, [rawData, notViableReasons, clientNotes]);

  const StatCard = ({ title, value, change, icon: Icon, format = 'currency' }) => {
    const isPositive = parseFloat(change) > 0;
    let displayValue = value;
    
    if (format === 'currency') {
      displayValue = formatCurrency(value);
    } else if (format === 'hours') {
      displayValue = `${value.toFixed(1)}h`;
    }
    
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{displayValue}</div>
        <div className="flex items-center text-sm">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(change)}%
          </span>
          <span className="text-gray-500 ml-1">vs last week</span>
        </div>
      </div>
    );
  };

  // Psych assessment to ABA conversion tracking
  const psychToABAConversion = useMemo(() => {
    if (rawData.length === 0) return { needsConversion: [], converted: [], conversionRate: 0 };
    
    const psychCodes = ['90791', '96130', '96131', '96136', '96137'];
    const abaCodes = ['97155', '97153'];
    
    // Group by client to see their service history
    const clientHistory = {};
    
    rawData.forEach(entry => {
      const name = entry.ClientName;
      if (!name || name === ' ') return;
      
      if (!clientHistory[name]) {
        clientHistory[name] = {
          name,
          hadPsych: false,
          lastPsychDate: null,
          hasABA: false,
          firstABADate: null,
          psychSessions: 0,
          abaSessions: 0
        };
      }
      
      const code = entry.ProcedureCode;
      
      // Parse date
      let date;
      const dateStr = entry.DateOfService;
      if (dateStr.includes('/')) {
        const datePart = dateStr.split(' ')[0];
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          let year = parseInt(parts[2]);
          if (year < 100) year += 2000;
          date = new Date(year, month, day);
        }
      } else if (dateStr.includes('-')) {
        const datePart = dateStr.split(' ')[0];
        date = new Date(datePart);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return;
      
      // Track psych assessments
      if (psychCodes.includes(code)) {
        clientHistory[name].hadPsych = true;
        clientHistory[name].psychSessions += 1;
        if (!clientHistory[name].lastPsychDate || date > clientHistory[name].lastPsychDate) {
          clientHistory[name].lastPsychDate = date;
        }
      }
      
      // Track ABA services
      if (abaCodes.includes(code)) {
        clientHistory[name].hasABA = true;
        clientHistory[name].abaSessions += 1;
        if (!clientHistory[name].firstABADate || date < clientHistory[name].firstABADate) {
          clientHistory[name].firstABADate = date;
        }
      }
    });
    
    // Find clients who had psych but no ABA yet (within last 75 days)
    const needsConversion = [];
    const converted = [];
    
    Object.values(clientHistory).forEach(client => {
      if (client.hadPsych && !client.hasABA) {
        const daysSincePsych = Math.floor((new Date() - client.lastPsychDate) / (1000 * 60 * 60 * 24));
        
        // Only include if within 75 days for real-time action
        if (daysSincePsych <= 75) {
          needsConversion.push({
            ...client,
            daysSincePsych,
            notViableReason: notViableReasons[client.name] || null
          });
        }
      } else if (client.hadPsych && client.hasABA) {
        const conversionDays = Math.floor((client.firstABADate - client.lastPsychDate) / (1000 * 60 * 60 * 24));
        converted.push({
          ...client,
          conversionDays
        });
      }
    });
    
    return {
      needsConversion: needsConversion.sort((a, b) => a.daysSincePsych - b.daysSincePsych),
      converted: converted.sort((a, b) => b.firstABADate - a.firstABADate).slice(0, 10),
      conversionRate: clientHistory ? (converted.length / (converted.length + needsConversion.length) * 100).toFixed(1) : 0
    };
  }, [rawData, notViableReasons]);

  if (showInstructions && rawData.length === 0) {
    return (
      <div className="w-full h-full bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full border border-gray-200">
          <div className="flex items-center mb-6">
            <Download className="w-8 h-8 text-blue-500 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Load Your Weekly Billing Data</h2>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Option 1: Upload CSV File</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 bg-blue-50 p-4 rounded-lg">
              <li>Open your Google Sheet</li>
              <li><strong>IMPORTANT:</strong> Widen the DateOfService column so you can see actual dates (not ##########)</li>
              <li>Go to <strong>File → Download → Comma-separated values (.csv)</strong></li>
              <li>Click the button below and select that CSV file</li>
            </ol>
          </div>

          <div className="mb-6">
            <label className="block">
              <div className="flex items-center justify-center w-full h-32 px-4 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-600">Click to upload CSV</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">CSV file from Google Sheets</p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="mb-6 border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Option 2: Auto-Load from URL (for HubSpot embedding)</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 bg-green-50 p-4 rounded-lg">
              <li>Upload your CSV to Google Drive or Dropbox</li>
              <li>Get a direct download link (must end in the CSV file, not a preview page)</li>
              <li>Add <code className="bg-white px-1 rounded">?csv=YOUR_CSV_URL</code> to the end of this page's URL</li>
              <li>Example: <code className="bg-white px-1 rounded text-xs">{window.location.origin}?csv=https://your-file-url.csv</code></li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> Your data stays private and is only processed in your browser.
            </p>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="w-full h-full bg-gray-50 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Billing & Client Trends</h1>
            <p className="text-gray-600">
              {rawData.length} sessions • {weeklyData.length} weeks • {latestWeekClients.length} clients this week
              {weeklyData.length > 0 && (
                <span className="ml-2">
                  ({formatDate(weeklyData[0].week)} - {formatDate(weeklyData[weeklyData.length - 1].week)})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowInstructions(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Load New Data
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Agreed Charges"
            value={latestWeek.agreedRevenue || 0}
            change={latestWeek.revenueChange || 0}
            icon={DollarSign}
          />
          <StatCard
            title="Total Hours"
            value={latestWeek.totalHours || 0}
            change={latestWeek.hoursChange || 0}
            icon={Clock}
            format="hours"
          />
          <StatCard
            title="Active Clients"
            value={latestWeek.clientCount || 0}
            change={previousWeek.clientCount > 0 ? (((latestWeek.clientCount - previousWeek.clientCount) / previousWeek.clientCount * 100) || 0).toFixed(1) : 0}
            icon={Users}
            format="number"
          />
          <StatCard
            title="Avg Revenue/Hour"
            value={latestWeek.avgRevenuePerHour || 0}
            change={previousWeek.avgRevenuePerHour > 0 ? (((latestWeek.avgRevenuePerHour - previousWeek.avgRevenuePerHour) / previousWeek.avgRevenuePerHour * 100) || 0).toFixed(1) : 0}
            icon={DollarSign}
          />
        </div>

        {/* Metric Selector */}
        <div className="bg-white rounded-lg shadow mb-6 p-4 border border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedMetric === 'revenue'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Agreed Charges
            </button>
            <button
              onClick={() => setSelectedMetric('hours')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedMetric === 'hours'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hours
            </button>
            <button
              onClick={() => setSelectedMetric('clients')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedMetric === 'clients'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active Clients
            </button>
            <button
              onClick={() => setSelectedMetric('sessions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedMetric === 'sessions'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sessions
            </button>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Trend</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="week" 
                tickFormatter={formatDate}
                stroke="#6b7280"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value) => {
                  if (selectedMetric === 'revenue') return formatCurrency(value);
                  if (selectedMetric === 'hours') return `${value.toFixed(1)}h`;
                  return value;
                }}
                labelFormatter={formatDate}
              />
              <Legend />
              {selectedMetric === 'revenue' && (
                <Line
                  type="monotone"
                  dataKey="agreedRevenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Agreed Charges"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              )}
              {selectedMetric === 'hours' && (
                <Line
                  type="monotone"
                  dataKey="totalHours"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Total Hours"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              )}
              {selectedMetric === 'clients' && (
                <Line
                  type="monotone"
                  dataKey="clientCount"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Active Clients"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              )}
              {selectedMetric === 'sessions' && (
                <Line
                  type="monotone"
                  dataKey="sessionCount"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Number of Sessions"
                  dot={{ fill: '#f59e0b', r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue and Hours Comparison */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Agreed Charges & Hours</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tickFormatter={formatDate} stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Agreed Charges') return formatCurrency(value);
                  return `${value.toFixed(1)}h`;
                }}
                labelFormatter={formatDate} 
              />
              <Legend />
              <Bar yAxisId="left" dataKey="agreedRevenue" fill="#3b82f6" name="Agreed Charges" />
              <Bar yAxisId="right" dataKey="totalHours" fill="#10b981" name="Hours Worked" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients and Client Changes - ONLY 97153 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Top Clients This Week (97153 only)</h2>
            <p className="text-sm text-gray-600 mb-4">By agreed charges</p>
            <div className="space-y-4">
              {latestWeekClients.slice(0, 10).map((client, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{client.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({client.sessionCount} sessions, {client.totalHours.toFixed(1)}h)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${latestWeekClients.length > 0 ? (client.totalRevenue / latestWeekClients[0].totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 font-semibold text-gray-900">{formatCurrency(client.totalRevenue)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Client Hour Changes - WoW (97153 only)</h2>
            <p className="text-sm text-gray-600 mb-4">Clients with 25%+ change in billable hours</p>
            <div className="space-y-3">
              {clientWoWChanges.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No significant changes this week</p>
              ) : (
                clientWoWChanges.slice(0, 10).map((client, idx) => (
                  <div key={idx} className="border-l-4 pl-3 py-2" style={{
                    borderColor: client.isNew ? '#10b981' : client.isGone ? '#ef4444' : client.change > 0 ? '#3b82f6' : '#f59e0b'
                  }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{client.name}</span>
                      <div className="flex items-center">
                        {client.isNew ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">NEW</span>
                        ) : client.isGone ? (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">INACTIVE</span>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded ${
                            client.change > 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {client.change > 0 ? '+' : ''}{client.percentChange.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {client.previousHours.toFixed(1)}h → {client.latestHours.toFixed(1)}h
                      <span className={`ml-2 font-medium ${client.change > 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        ({client.change > 0 ? '+' : ''}{client.change.toFixed(1)}h)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Psych to ABA Conversion Tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Psych Assessment → ABA Conversion</h2>
                <p className="text-sm text-gray-600">Clients who completed psych in last 75 days but haven't started ABA</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-3xl font-bold text-orange-600">{psychToABAConversion.needsConversion?.length || 0}</div>
                  <div className="text-xs text-gray-500">Need Follow-up</div>
                </div>
                <button
                  onClick={exportToHubSpot}
                  disabled={isExporting || !psychToABAConversion.needsConversion?.length}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isExporting ? 'Exporting...' : 'Export to CSV'}
                </button>
              </div>
            </div>
            {exportStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                exportStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {exportStatus.message}
              </div>
            )}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {psychToABAConversion.needsConversion?.length === 0 ? (
                <p className="text-gray-500 text-sm italic">All psych assessment clients have started ABA!</p>
              ) : (
                psychToABAConversion.needsConversion?.map((client, idx) => (
                  <div key={idx} className={`border-l-4 pl-3 py-2 ${
                    client.notViableReason ? 'bg-gray-100 border-gray-400' : 'bg-orange-50 border-orange-500'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${client.notViableReason ? 'text-gray-500' : 'text-gray-900'}`}>
                        {client.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        client.notViableReason ? 'bg-gray-200 text-gray-700' :
                        client.daysSincePsych > 60 ? 'bg-red-100 text-red-800' :
                        client.daysSincePsych > 45 ? 'bg-orange-100 text-orange-800' :
                        client.daysSincePsych > 30 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {client.daysSincePsych} days ago
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Last psych: {client.lastPsychDate?.toLocaleDateString()} • {client.psychSessions} psych session{client.psychSessions !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Not Viable:</label>
                      <select
                        value={client.notViableReason || ''}
                        onChange={(e) => handleNotViableChange(client.name, e.target.value || null)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="">-- Select Reason --</option>
                        <option value="insurance">Insurance</option>
                        <option value="no-response">No Response</option>
                        <option value="competitor">Competitor</option>
                        <option value="center-based">Center Based</option>
                        <option value="financial">Financial</option>
                        <option value="service-area">Service Area</option>
                        <option value="age">Age</option>
                      </select>
                      {client.notViableReason && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {client.notViableReason.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recent Conversions</h2>
                <p className="text-sm text-gray-600">Clients who started ABA after psych assessment</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{psychToABAConversion.conversionRate || 0}%</div>
                <div className="text-xs text-gray-500">Conversion Rate</div>
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {!psychToABAConversion.converted || psychToABAConversion.converted.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-gray-500 text-sm font-medium mb-2">No conversions yet</p>
                  <p className="text-gray-400 text-xs">Clients who complete ABA services after psych will appear here</p>
                </div>
              ) : (
                psychToABAConversion.converted.map((client, idx) => (
                  <div key={idx} className="border-l-4 border-green-500 pl-3 py-2 bg-green-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{client.name}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Converted in {client.conversionDays} days
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Started ABA: {client.firstABADate?.toLocaleDateString()} • {client.abaSessions} ABA session{client.abaSessions !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* PSYCH CONVERSION PIPELINE DASHBOARD */}
        {psychDashboardData && (
          <div className="mb-8">
            {/* Section Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-lg shadow p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">🎯 Psych Assessment Conversion Pipeline</h2>
              <p className="text-purple-100">
                Comprehensive tracking of {psychDashboardData.totalWithPsych} clients from initial psych assessment through ABA conversion
              </p>
            </div>

            {/* Conversion Metrics */}
            <div className="bg-white shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border-b border-gray-200">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-2">Active Leads</div>
                  <div className="text-4xl font-bold text-blue-600 mb-1">{psychDashboardData.activeLeads.length}</div>
                  <div className="text-xs text-gray-500">0-45 days since psych</div>
                  <div className="mt-2 text-xs text-gray-600">Ready for follow-up</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-2">At Risk</div>
                  <div className="text-4xl font-bold text-orange-600 mb-1">{psychDashboardData.atRisk.length}</div>
                  <div className="text-xs text-gray-500">46-75 days since psych</div>
                  <div className="mt-2 text-xs text-orange-600 font-medium">⚠️ Urgent attention needed</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-2">Conversion Rate</div>
                  <div className="text-4xl font-bold text-green-600 mb-1">{psychDashboardData.conversionRate}%</div>
                  <div className="text-xs text-gray-500">Successfully converted</div>
                  <div className="mt-2 text-xs text-gray-600">{psychDashboardData.converted.length} conversions</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-2">Avg Time to Convert</div>
                  <div className="text-4xl font-bold text-purple-600 mb-1">{psychDashboardData.avgDaysToConversion}</div>
                  <div className="text-xs text-gray-500">days on average</div>
                  <div className="mt-2 text-xs text-gray-600">From psych → ABA</div>
                </div>
              </div>

              {/* Pipeline Cohort Analysis */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pipeline Status by Time Since Psych Assessment</h3>
                <div className="space-y-4">
                  {Object.entries(psychDashboardData.cohorts).map(([range, data]) => {
                    const total = data.active + data.atRisk + data.notViable;
                    if (total === 0) return null;
                    return (
                      <div key={range} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-900">Days {range}</span>
                          <span className="text-sm font-medium text-gray-700">{total} clients</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-8 flex overflow-hidden shadow-inner">
                          {data.active > 0 && (
                            <div
                              className="bg-blue-500 flex items-center justify-center text-xs text-white font-semibold transition-all hover:bg-blue-600"
                              style={{ width: `${(data.active / total) * 100}%` }}
                              title={`${data.active} Active`}
                            >
                              {data.active}
                            </div>
                          )}
                          {data.atRisk > 0 && (
                            <div
                              className="bg-orange-500 flex items-center justify-center text-xs text-white font-semibold transition-all hover:bg-orange-600"
                              style={{ width: `${(data.atRisk / total) * 100}%` }}
                              title={`${data.atRisk} At Risk`}
                            >
                              {data.atRisk}
                            </div>
                          )}
                          {data.notViable > 0 && (
                            <div
                              className="bg-gray-400 flex items-center justify-center text-xs text-white font-semibold transition-all hover:bg-gray-500"
                              style={{ width: `${(data.notViable / total) * 100}%` }}
                              title={`${data.notViable} Not Viable`}
                            >
                              {data.notViable}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-6 mt-2 text-xs">
                          <span className="flex items-center text-blue-600">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                            {data.active} Active
                          </span>
                          <span className="flex items-center text-orange-600">
                            <span className="w-3 h-3 bg-orange-500 rounded-full mr-1"></span>
                            {data.atRisk} At Risk
                          </span>
                          <span className="flex items-center text-gray-600">
                            <span className="w-3 h-3 bg-gray-400 rounded-full mr-1"></span>
                            {data.notViable} Not Viable
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Leads & At Risk Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-gray-200">
                {/* Active Leads */}
                <div className="p-6 border-r border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      💙 Active Leads ({psychDashboardData.activeLeads.length})
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Recent psych assessments ready for follow-up (0-45 days)</p>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {psychDashboardData.activeLeads.length === 0 ? (
                      <p className="text-gray-500 text-sm italic text-center py-8">No active leads at this time</p>
                    ) : (
                      psychDashboardData.activeLeads.map((client, idx) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r-lg hover:bg-blue-100 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">{client.name}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              client.daysSinceLastPsych <= 14 ? 'bg-green-100 text-green-800' :
                              client.daysSinceLastPsych <= 30 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {client.daysSinceLastPsych} days ago
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 mb-3">
                            <div>📅 Last psych: {client.lastPsychDate.toLocaleDateString()}</div>
                            <div>📊 {client.psychSessions} session{client.psychSessions !== 1 ? 's' : ''}</div>
                            <div>🏷️ Codes: {client.psychCodes.join(', ')}</div>
                          </div>
                          <div className="space-y-2">
                            <select
                              value={client.notViableReason || ''}
                              onChange={(e) => handleNotViableChange(client.name, e.target.value || null)}
                              className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">✓ Mark as Not Viable (Optional)</option>
                              <option value="insurance">Insurance Issues</option>
                              <option value="no-response">No Response</option>
                              <option value="competitor">Went to Competitor</option>
                              <option value="center-based">Prefers Center Based</option>
                              <option value="financial">Financial Constraints</option>
                              <option value="service-area">Outside Service Area</option>
                              <option value="age">Age Inappropriate</option>
                              <option value="other">Other</option>
                            </select>
                            <textarea
                              placeholder="💭 Add notes: follow-up attempts, barriers, next steps..."
                              value={clientNotes[client.name] || ''}
                              onChange={(e) => setClientNotes(prev => ({ ...prev, [client.name]: e.target.value }))}
                              className="text-xs border border-gray-300 rounded px-2 py-1.5 w-full resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows="2"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* At Risk */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      ⚠️ At Risk ({psychDashboardData.atRisk.length})
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Getting stale - needs urgent attention (46-75 days)</p>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {psychDashboardData.atRisk.length === 0 ? (
                      <p className="text-gray-500 text-sm italic text-center py-8">No at-risk clients - great job!</p>
                    ) : (
                      psychDashboardData.atRisk.map((client, idx) => (
                        <div key={idx} className="border-l-4 border-orange-500 pl-4 py-3 bg-orange-50 rounded-r-lg hover:bg-orange-100 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">{client.name}</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                              ⏰ {client.daysSinceLastPsych} days ago
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 mb-3">
                            <div>📅 Last psych: {client.lastPsychDate.toLocaleDateString()}</div>
                            <div>📊 {client.psychSessions} session{client.psychSessions !== 1 ? 's' : ''}</div>
                            <div>🏷️ Codes: {client.psychCodes.join(', ')}</div>
                          </div>
                          <div className="space-y-2">
                            <select
                              value={client.notViableReason || ''}
                              onChange={(e) => handleNotViableChange(client.name, e.target.value || null)}
                              className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                              <option value="">✓ Mark as Not Viable (Optional)</option>
                              <option value="insurance">Insurance Issues</option>
                              <option value="no-response">No Response</option>
                              <option value="competitor">Went to Competitor</option>
                              <option value="center-based">Prefers Center Based</option>
                              <option value="financial">Financial Constraints</option>
                              <option value="service-area">Outside Service Area</option>
                              <option value="age">Age Inappropriate</option>
                              <option value="other">Other</option>
                            </select>
                            <textarea
                              placeholder="💭 Add notes: follow-up attempts, barriers, next steps..."
                              value={clientNotes[client.name] || ''}
                              onChange={(e) => setClientNotes(prev => ({ ...prev, [client.name]: e.target.value }))}
                              className="text-xs border border-gray-300 rounded px-2 py-1.5 w-full resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              rows="2"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Successfully Converted */}
              <div className="p-6 bg-green-50 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  ✅ Successfully Converted ({psychDashboardData.converted.length})
                </h3>
                <p className="text-sm text-gray-600 mb-4">Clients who started ABA services after psych assessment</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                  {psychDashboardData.converted.length === 0 ? (
                    <p className="text-gray-500 text-sm italic col-span-3 text-center py-8">No conversions yet</p>
                  ) : (
                    psychDashboardData.converted.map((client, idx) => (
                      <div key={idx} className="border-l-4 border-green-500 pl-3 py-3 bg-white rounded-r-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900 text-sm">{client.name}</span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                            🎯 {client.daysToConversion} days
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>📅 Psych: {client.lastPsychDate.toLocaleDateString()}</div>
                          <div>🎉 Started ABA: {client.firstABADate.toLocaleDateString()}</div>
                          <div className="pt-1 border-t border-gray-200">
                            💰 {formatCurrency(client.totalRevenue)} revenue
                          </div>
                          <div>{client.abaSessions} ABA sessions completed</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Not Viable */}
              {psychDashboardData.notViable.length > 0 && (
                <div className="p-6 bg-gray-50 rounded-b-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    ❌ Not Viable ({psychDashboardData.notViable.length})
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">Clients marked as unable to convert</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto">
                    {psychDashboardData.notViable.map((client, idx) => (
                      <div key={idx} className="border-l-4 border-gray-400 pl-3 py-2 bg-white rounded-r-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-700 text-sm">{client.name}</span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">
                            {client.notViableReason?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>Last psych: {client.lastPsychDate.toLocaleDateString()}</div>
                          <div>({client.daysSinceLastPsych} days ago)</div>
                          {client.notes && (
                            <div className="mt-2 italic text-gray-500 text-xs">
                              💭 {client.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekly Details Table */}
        <div className="bg-white rounded-lg shadow mt-8 overflow-hidden border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Weekly Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week Starting
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clients
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agreed Charges
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    $/Hour
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Hours/Session
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {weeklyData.map((week, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(week.week)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {week.sessionCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {week.clientCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(week.agreedRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {week.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(week.avgRevenuePerHour)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {week.avgSessionLength.toFixed(2)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyBillingTrends;
