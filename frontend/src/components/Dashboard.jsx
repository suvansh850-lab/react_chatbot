import React, { useState, useEffect, useRef } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell 
} from 'recharts';
import "./Dashboard.css";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#a4de6c', '#d0ed57', '#ffc0cb'];

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    kpis: { revenue: 0, units_sold: 0, top_product: "N/A", top_region: "N/A", change_pct: 0 },
    charts: { timeline: [], regions: [], products: [] }
  });
  
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  
  // AI Agent states
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  const fileInputRef = useRef();

  const getBackendUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      const trimmed = import.meta.env.VITE_API_URL.replace(/\/$/, "");
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
    return `${window.location.origin}/api`;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getBackendUrl()}/crew/dashboard-summary`);
      const resData = await res.json();
      if (resData.success) {
        setData({
          kpis: resData.kpis,
          charts: resData.charts
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
    setUploadStatus("");
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      alert("Please select a CSV file first.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", csvFile);
    
    setUploadStatus("Uploading and parsing...");
    try {
      const res = await fetch(`${getBackendUrl()}/crew/upload-csv`, {
        method: "POST",
        body: formData
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setUploadStatus(`Success: ${resData.message}`);
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        setUploadStatus(`Error: ${resData.detail || "Upload failed"}`);
      }
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    }
  };

  const handleAiQuery = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${getBackendUrl()}/crew/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery })
      });
      const resData = await res.json();
      if (res.ok) {
        setAiResult(resData);
        // If the AI agent output contains new temporary chart/kpi stats, we map them
        if (resData.kpis && Object.keys(resData.kpis).length > 0) {
          setData(prev => ({
            ...prev,
            kpis: { ...prev.kpis, ...resData.kpis }
          }));
        }
      } else {
        alert(resData.detail || "AI analysis failed");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header no-print">
        <div className="header-title">
          <h2>Business Operations & Analytics</h2>
          <p>Multi-Agent data reporting & insights</p>
        </div>
        <div className="header-actions">
          <button className="export-btn" onClick={handleExportPdf}>
            <span className="material-symbols-outlined">download</span> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading Analytics System...</div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="material-symbols-outlined kpi-icon rev">payments</span>
              <div className="kpi-info">
                <h3>Total Revenue</h3>
                <p className="kpi-value">${data.kpis.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            
            <div className="kpi-card">
              <span className="material-symbols-outlined kpi-icon units">shopping_bag</span>
              <div className="kpi-info">
                <h3>Units Sold</h3>
                <p className="kpi-value">{data.kpis.units_sold.toLocaleString()}</p>
              </div>
            </div>

            <div className="kpi-card">
              <span className="material-symbols-outlined kpi-icon prod">inventory_2</span>
              <div className="kpi-info">
                <h3>Top Product</h3>
                <p className="kpi-value">{data.kpis.top_product}</p>
              </div>
            </div>

            <div className="kpi-card">
              <span className="material-symbols-outlined kpi-icon region">public</span>
              <div className="kpi-info">
                <h3>Top Region</h3>
                <p className="kpi-value">{data.kpis.top_region}</p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* 1. Monthly revenue trend */}
            <div className="chart-card large">
              <h3>Revenue Trend Timeline</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.timeline}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Regional sales */}
            <div className="chart-card">
              <h3>Regional Revenue</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.regions}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Product division Pie chart */}
            <div className="chart-card">
              <h3>Product Divisions Share</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.products}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.charts.products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CSV upload and AI Agent Queries */}
          <div className="bottom-grid no-print">
            {/* CSV Uploader */}
            <div className="bottom-card csv-card">
              <h3><span className="material-symbols-outlined">upload_file</span> Load New Sales CSV Data</h3>
              <p className="card-desc">Upload a CSV file containing date, region, product, revenue, and units_sold columns.</p>
              
              <div className="upload-input-group">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  ref={fileInputRef}
                  className="file-input"
                />
                <button onClick={handleCsvUpload} disabled={!csvFile} className="upload-btn">
                  Upload CSV
                </button>
              </div>
              {uploadStatus && <p className={`upload-status ${uploadStatus.includes("Error") ? "error" : "success"}`}>{uploadStatus}</p>}
            </div>

            {/* AI Business Operations Agent Query Box */}
            <div className="bottom-card ai-card">
              <h3><span className="material-symbols-outlined">query_stats</span> Query AI Operations Agent</h3>
              <p className="card-desc">Ask queries like: "Why did sales drop in the North region?" or "Analyze monthly revenue trends."</p>
              
              <form onSubmit={handleAiQuery} className="ai-query-form">
                <input 
                  type="text" 
                  value={aiQuery} 
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask a question about your sales..." 
                  className="query-input"
                />
                <button type="submit" disabled={aiLoading || !aiQuery.trim()} className="query-btn">
                  {aiLoading ? "Analyzing..." : "Ask Agent"}
                </button>
              </form>
            </div>
          </div>

          {/* AI Insights & Reports Render Panel */}
          {aiResult && (
            <div className="ai-report-panel">
              <div className="panel-header">
                <h3><span className="material-symbols-outlined">description</span> Operations Report & Insights</h3>
                <span className="agent-badge">CrewAI Agents</span>
              </div>
              <div className="panel-content">
                <div className="report-markdown">
                  {/* Formatting simple markdown highlights and recommendations */}
                  {aiResult.report.split("\n").map((line, idx) => {
                    if (line.startsWith("# ")) return <h2 key={idx}>{line.substring(2)}</h2>;
                    if (line.startsWith("## ")) return <h3 key={idx}>{line.substring(3)}</h3>;
                    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={idx}>{line.substring(2)}</li>;
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
                
                {aiResult.anomalies && aiResult.anomalies.length > 0 && (
                  <div className="anomalies-section">
                    <h4>Anomalies Detected</h4>
                    <ul>
                      {aiResult.anomalies.map((anom, idx) => (
                        <li key={idx} className="anomaly-item">
                          <span className="material-symbols-outlined error-icon">warning</span>
                          {anom}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
