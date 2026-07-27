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
  const [activeSubTab, setActiveSubTab] = useState("overview"); // "overview" or "knowledge"
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

  // Knowledge Manager states
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newContent, setNewContent] = useState("");
  
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

  const fetchKnowledgeItems = async () => {
    setKnowledgeLoading(true);
    try {
      const res = await fetch(`${getBackendUrl()}/knowledge`);
      const resData = await res.json();
      if (resData.success) {
        setKnowledgeItems(resData.data);
      }
    } catch (err) {
      console.error("Failed to load knowledge items:", err);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "overview") {
      fetchDashboardData();
    } else {
      fetchKnowledgeItems();
    }
  }, [activeSubTab]);

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

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Title and Content are required.");
      return;
    }

    try {
      const res = await fetch(`${getBackendUrl()}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent
        })
      });
      const resData = await res.json();
      if (resData.success) {
        alert("Knowledge item added successfully!");
        setNewTitle("");
        setNewContent("");
        setNewCategory("General");
        fetchKnowledgeItems();
      } else {
        alert(resData.error || "Failed to add knowledge item.");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteKnowledge = async (id) => {
    if (!window.confirm("Are you sure you want to delete this knowledge record?")) return;

    try {
      const res = await fetch(`${getBackendUrl()}/knowledge/${id}`, {
        method: "DELETE"
      });
      const resData = await res.json();
      if (resData.success) {
        alert("Knowledge item deleted successfully!");
        fetchKnowledgeItems();
      } else {
        alert(resData.error || "Failed to delete knowledge item.");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
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
        <div className="dashboard-subtabs">
          <button 
            className={`subtab-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`subtab-btn ${activeSubTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('knowledge')}
          >
            Knowledge Base Manager
          </button>
        </div>
        <div className="header-actions">
          {activeSubTab === 'overview' && (
            <button className="export-btn" onClick={handleExportPdf}>
              <span className="material-symbols-outlined">download</span> Export PDF
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'knowledge' ? (
        <div className="knowledge-manager-section">
          {/* Add Knowledge Form */}
          <div className="bottom-card add-knowledge-card">
            <h3><span className="material-symbols-outlined">add_circle</span> Add New Knowledge Record</h3>
            <p className="card-desc">Inject new context/facts for the chatbot. It will query these records to answer user queries.</p>
            <form onSubmit={handleAddKnowledge} className="knowledge-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title/Header</label>
                  <input 
                    type="text" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)} 
                    placeholder="e.g. Baddi Factory Capacity 2026"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="General">General</option>
                    <option value="Diagnostics">Diagnostics</option>
                    <option value="OTC">OTC</option>
                    <option value="Wellness">Wellness</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Content (Full Details)</label>
                <textarea 
                  value={newContent} 
                  onChange={(e) => setNewContent(e.target.value)} 
                  placeholder="Enter full details, facts, or product parameters..."
                  className="form-textarea"
                  rows={4}
                />
              </div>
              <button type="submit" className="add-btn">Save to Database</button>
            </form>
          </div>

          {/* List Knowledge Records */}
          <div className="bottom-card list-knowledge-card" style={{ marginTop: '20px' }}>
            <h3><span className="material-symbols-outlined">database</span> Database Knowledge Records</h3>
            <p className="card-desc">Active records used by the chatbot for RAG answering.</p>
            
            {knowledgeLoading ? (
              <p>Loading knowledge records...</p>
            ) : knowledgeItems.length === 0 ? (
              <p className="empty-msg">No records found. The chatbot's database brain is empty!</p>
            ) : (
              <div className="knowledge-list-table-wrapper">
                <table className="knowledge-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Category</th>
                      <th style={{ width: '220px' }}>Title</th>
                      <th>Content Snippet</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {knowledgeItems.map((item) => (
                      <tr key={item.id}>
                        <td><span className="cat-badge">{item.category}</span></td>
                        <td className="item-title">{item.title}</td>
                        <td className="item-content">{item.content.substring(0, 100)}...</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="delete-item-btn material-symbols-outlined"
                            onClick={() => handleDeleteKnowledge(item.id)}
                            title="Delete record"
                          >
                            delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default Dashboard;
