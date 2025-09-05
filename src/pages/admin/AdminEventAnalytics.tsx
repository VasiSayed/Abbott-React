import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  Link as LinkIcon,
  Loader2,
  Search,
  X,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
} from "lucide-react";
import { eventsAPI, type EventDTO } from "../../utils/api";

type LogStatus = "SUCCESS" | "REFUSED" | "ERROR";

type AnalyticsResponse = {
  event: EventDTO;
  registrations: { total: number };
  attempts: { total: number; success: number; refused: number; error: number };
  daily: {
    labels: string[];
    success: number[];
    refused: number[];
    error: number[];
  };
  speciality: Array<{ speciality: string; count: number }>;
  hospitals_top10: Array<{ hospital: string; count: number }>;
  recent_logs: Array<{
    id: string | number;
    user: number | null;
    event: string;
    status: LogStatus;
    message: string;
    ip: string | null;
    user_agent: string | null;
    occurred_at: string;
  }>;
};

const statusConfig = {
  SUCCESS: {
    icon: CheckCircle,
    className: "badge success",
    color: "#10b981",
  },
  REFUSED: {
    icon: XCircle,
    className: "badge refused",
    color: "#f59e0b",
  },
  ERROR: {
    icon: AlertCircle,
    className: "badge error",
    color: "#ef4444",
  },
};

const formatDate = (dt: string) =>
  new Date(dt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (dt: string) =>
  new Date(dt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const AdminEventAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const code = sp.get("code") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | LogStatus>("");

  // Fetch list of events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventsAPI.list();
        setEvents(res.data || []);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      }
    };

    fetchEvents();
  }, []);

  // Fetch analytics when code changes
  useEffect(() => {
    if (!code) return;
    fetchAnalytics();
  }, [code]);

  const fetchAnalytics = async () => {
    if (!code) return;

    setLoading(true);
    setError(null);
    try {
      const res = await eventsAPI.analytics(code);
      setData(res.data as AnalyticsResponse);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!code) return;
    setRefreshing(true);
    try {
      const res = await eventsAPI.analytics(code);
      setData(res.data as AnalyticsResponse);
    } catch (err) {
      console.error("Analytics refresh error:", err);
      setError("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!data?.recent_logs) return [];
    if (!statusFilter) return data.recent_logs;
    return data.recent_logs.filter((l) => l.status === statusFilter);
  }, [data, statusFilter]);

  const changeEvent = (newCode: string) => {
    const next = new URLSearchParams(sp);
    if (newCode) next.set("code", newCode);
    else next.delete("code");
    setSp(next, { replace: true });
  };

  const getSuccessRate = () => {
    if (!data) return 0;
    return data.attempts.total > 0
      ? Math.round((data.attempts.success / data.attempts.total) * 100)
      : 0;
  };

  const getTrendData = () => {
    if (!data?.daily?.success || data.daily.success.length < 6) {
      return { trend: 0, isPositive: true };
    }

    const recent = data.daily.success.slice(-3);
    const previous = data.daily.success.slice(-6, -3);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    if (previousAvg === 0) return { trend: 0, isPositive: true };

    const trend = Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
    return { trend: Math.abs(trend), isPositive: trend >= 0 };
  };

  const exportData = () => {
    if (!data) return;

    const csvData = [
      "Timestamp,Status,User ID,Message,IP Address",
      ...filteredLogs.map(
        (log) =>
          `"${new Date(log.occurred_at).toLocaleString()}","${log.status}","${
            log.user || "N/A"
          }","${log.message || "N/A"}","${log.ip || "N/A"}"`
      ),
    ].join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${data.event.code}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">A</div>
            <span className="brand-name">Abbott</span>
          </div>
          <div className="header-actions">
            <input
              className="search-input"
              placeholder="Search admin content..."
            />
            <button className="btn btn-ghost">Logout</button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="nav">
            <a href="/admin/dashboard">
              <BarChart3 size={18} /> Dashboard
            </a>
            <a href="/admin/meetings">
              <Calendar size={18} /> Manage Meetings
            </a>
            <a href="/admin/registrations">
              <Users size={18} /> Registrations
            </a>
            <a href="/admin/analytics" className="active">
              <Activity size={18} /> Analytics
            </a>
            <a href="/admin/export">
              <Download size={18} /> Data Export
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="content">
          <div className="container">
            {/* Page Header */}
            <div className="page-header">
              <div className="header-left">
                <button
                  className="btn btn-outline"
                  onClick={() => navigate("/admin/meetings")}
                >
                  <ArrowLeft size={16} />
                  Back to Meetings
                </button>
                <h1 className="page-title">Event Analytics</h1>
              </div>

              <div className="header-right">
                <div className="event-picker">
                  <Search size={16} className="picker-icon" />
                  <select
                    value={code}
                    onChange={(e) => changeEvent(e.target.value)}
                    className="picker-select"
                  >
                    <option value="">
                      {events.length
                        ? "Select event to analyze…"
                        : "Loading events…"}
                    </option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.code}>
                        {ev.title || ev.code} ({ev.code})
                      </option>
                    ))}
                  </select>
                </div>

                {code && (
                  <button
                    className="btn btn-outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw
                      size={16}
                      className={refreshing ? "spinning" : ""}
                    />
                    Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Empty State */}
            {!code && (
              <div className="empty-state">
                <BarChart3 size={48} className="empty-icon" />
                <h3>Select an event to view analytics</h3>
                <p>
                  Choose an event from the dropdown above to see detailed
                  analytics including registrations, success rates, and activity
                  logs.
                </p>
              </div>
            )}

            {/* Loading State */}
            {code && loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading analytics data...</p>
              </div>
            )}

            {/* Error State */}
            {code && !loading && error && (
              <div className="error-state">
                <AlertCircle size={24} />
                <div>
                  <h3>Failed to load analytics</h3>
                  <p>{error}</p>
                  <button className="btn btn-primary" onClick={fetchAnalytics}>
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Analytics Content */}
            {code && !loading && !error && data && (
              <>
                {/* Event Overview */}
                <div className="event-overview">
                  <div className="event-header">
                    <div className="event-title-section">
                      <h2 className="event-title">
                        {data.event.title || data.event.code}
                      </h2>
                      <span className="event-code">{data.event.code}</span>
                      {data.event.is_live_now && (
                        <span className="live-badge">
                          <div className="live-dot"></div>
                          Live Now
                        </span>
                      )}
                    </div>

                    <div className="event-actions">
                      <button className="btn btn-outline" onClick={exportData}>
                        <Download size={16} />
                        Export Data
                      </button>
                      <a
                        href={`/event/${data.event.code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                      >
                        <Eye size={16} />
                        View Public Page
                      </a>
                    </div>
                  </div>

                  <div className="event-meta">
                    <div className="meta-item">
                      <Calendar size={16} />
                      <span>{formatDate(data.event.start_at)}</span>
                    </div>
                    <div className="meta-item">
                      <Clock size={16} />
                      <span>
                        {formatTime(data.event.start_at)} –{" "}
                        {formatTime(data.event.end_at)}
                      </span>
                    </div>
                    {data.event.link && (
                      <div className="meta-item">
                        <LinkIcon size={16} />
                        <a
                          href={data.event.link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Meeting Link
                        </a>
                      </div>
                    )}
                  </div>

                  {data.event.description && (
                    <p className="event-description">
                      {data.event.description}
                    </p>
                  )}
                </div>

                {/* KPI Cards */}
                <div className="metrics-grid">
                  <div className="metric-card primary">
                    <div className="metric-icon">
                      <Users size={24} />
                    </div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {data.registrations.total}
                      </div>
                      <div className="metric-label">Total Registrations</div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">
                      <Activity size={24} />
                    </div>
                    <div className="metric-content">
                      <div className="metric-value">{data.attempts.total}</div>
                      <div className="metric-label">Total Attempts</div>
                      <div className="metric-trend">
                        {getTrendData().isPositive ? (
                          <TrendingUp size={14} className="trend-up" />
                        ) : (
                          <TrendingDown size={14} className="trend-down" />
                        )}
                        <span>{getTrendData().trend}% vs last period</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card success">
                    <div className="metric-icon">
                      <CheckCircle size={24} />
                    </div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {data.attempts.success}
                      </div>
                      <div className="metric-label">Successful</div>
                      <div className="metric-percentage">
                        {getSuccessRate()}% success rate
                      </div>
                    </div>
                  </div>

                  <div className="metric-card warning">
                    <div className="metric-icon">
                      <XCircle size={24} />
                    </div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {data.attempts.refused}
                      </div>
                      <div className="metric-label">Refused</div>
                    </div>
                  </div>

                  <div className="metric-card error">
                    <div className="metric-icon">
                      <AlertCircle size={24} />
                    </div>
                    <div className="metric-content">
                      <div className="metric-value">{data.attempts.error}</div>
                      <div className="metric-label">Errors</div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="charts-section">
                  <div className="chart-card">
                    <h3>Speciality Distribution</h3>
                    <div className="specialty-chart">
                      {data.speciality && data.speciality.length > 0 ? (
                        data.speciality.map((item, index) => (
                          <div key={item.speciality} className="specialty-bar">
                            <div className="specialty-info">
                              <span className="specialty-name">
                                {item.speciality}
                              </span>
                              <span className="specialty-count">
                                {item.count}
                              </span>
                            </div>
                            <div className="bar-container">
                              <div
                                className="bar-fill"
                                style={{
                                  width: `${
                                    (item.count / data.registrations.total) *
                                    100
                                  }%`,
                                  backgroundColor: `hsl(${
                                    (index * 360) / data.speciality.length
                                  }, 70%, 50%)`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-data">No speciality data available</p>
                      )}
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3>Top Hospitals</h3>
                    <div className="hospitals-chart">
                      {data.hospitals_top10 &&
                      data.hospitals_top10.length > 0 ? (
                        data.hospitals_top10.map((item, index) => (
                          <div key={item.hospital} className="hospital-item">
                            <div className="hospital-info">
                              <Building2 size={16} />
                              <span className="hospital-name">
                                {item.hospital}
                              </span>
                            </div>
                            <div className="hospital-stats">
                              <span className="hospital-count">
                                {item.count}
                              </span>
                              <div className="hospital-bar">
                                <div
                                  className="hospital-fill"
                                  style={{
                                    width: `${
                                      (item.count /
                                        data.hospitals_top10[0].count) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-data">No hospital data available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity Logs */}
                <div className="logs-section">
                  <div className="logs-header">
                    <h3>Recent Activity Logs</h3>
                    <div className="logs-controls">
                      <div className="filter-group">
                        <Filter size={16} />
                        <select
                          value={statusFilter}
                          onChange={(e) =>
                            setStatusFilter(e.target.value as any)
                          }
                        >
                          <option value="">All Status</option>
                          <option value="SUCCESS">Success Only</option>
                          <option value="REFUSED">Refused Only</option>
                          <option value="ERROR">Errors Only</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="logs-table-container">
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Status</th>
                          <th>User ID</th>
                          <th>Message</th>
                          <th>IP Address</th>
                          <th>User Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log) => {
                          const StatusIcon = statusConfig[log.status].icon;
                          return (
                            <tr key={log.id}>
                              <td className="timestamp-cell">
                                {new Date(log.occurred_at).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </td>
                              <td>
                                <div
                                  className={statusConfig[log.status].className}
                                >
                                  <StatusIcon size={14} />
                                  <span>{log.status}</span>
                                </div>
                              </td>
                              <td>
                                {log.user ? (
                                  <span className="user-id">#{log.user}</span>
                                ) : (
                                  <span className="no-user">Anonymous</span>
                                )}
                              </td>
                              <td className="message-cell">
                                {log.message || "-"}
                              </td>
                              <td className="ip-cell">{log.ip || "-"}</td>
                              <td className="user-agent-cell">
                                {log.user_agent ? (
                                  <span title={log.user_agent}>
                                    {log.user_agent.length > 50
                                      ? `${log.user_agent.substring(0, 50)}...`
                                      : log.user_agent}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {!filteredLogs.length && (
                          <tr>
                            <td colSpan={6} className="no-data">
                              No logs found for the selected filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .analytics-page {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            sans-serif;
          color: #1e293b;
        }

        /* Header */
        .header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          background: #3b82f6;
          color: white;
          font-weight: 800;
          font-size: 18px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .search-input {
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          width: 300px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Layout */
        .main-content {
          display: flex;
          min-height: calc(100vh - 73px);
        }

        .sidebar {
          width: 280px;
          background: white;
          border-right: 1px solid #e2e8f0;
        }

        .nav {
          padding: 24px;
        }

        .nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #64748b;
          text-decoration: none;
          border-radius: 8px;
          margin-bottom: 4px;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .nav a:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .nav a.active {
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 600;
        }

        .content {
          flex: 1;
          background: #f8fafc;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        .event-picker {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          min-width: 300px;
        }

        .picker-icon {
          color: #9ca3af;
        }

        .picker-select {
          border: none;
          outline: none;
          background: transparent;
          flex: 1;
          font-size: 14px;
        }

        /* States */
        .empty-state {
          text-align: center;
          padding: 80px 32px;
          background: white;
          border-radius: 16px;
          border: 2px dashed #d1d5db;
        }

        .empty-icon {
          color: #9ca3af;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #64748b;
          margin: 0;
          max-width: 400px;
          margin: 0 auto;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 32px;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .error-state {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 32px;
          background: white;
          border-radius: 16px;
          border: 1px solid #fecaca;
          background: #fef2f2;
        }

        .error-state h3 {
          margin: 0 0 4px 0;
          color: #dc2626;
        }

        .error-state p {
          margin: 0 0 12px 0;
          color: #b91c1c;
        }

        /* Event Overview */
        .event-overview {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .event-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .event-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .event-code {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, "Courier New", monospace;
          font-size: 12px;
          font-weight: 600;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fef3c7;
          color: #92400e;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          background: #f59e0b;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .event-actions {
          display: flex;
          gap: 12px;
        }

        .event-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 14px;
        }

        .meta-item a {
          color: #3b82f6;
          text-decoration: none;
        }

        .meta-item a:hover {
          text-decoration: underline;
        }

        .event-description {
          color: #374151;
          line-height: 1.6;
          margin: 12px 0 0 0;
        }

        /* Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .metric-card:hover {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .metric-card.primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .metric-card.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .metric-card.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .metric-card.error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .metric-icon {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }

        .metric-card:not(.primary):not(.success):not(.warning):not(.error)
          .metric-icon {
          background: #f8fafc;
          color: #3b82f6;
        }

        .metric-content {
          flex: 1;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .metric-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          opacity: 0.8;
        }

        .trend-up {
          color: #10b981;
        }

        .trend-down {
          color: #ef4444;
        }

        .metric-percentage {
          font-size: 12px;
          opacity: 0.8;
        }

        /* Charts Section */
        .charts-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        .chart-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .chart-card h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
        }

        .specialty-chart,
        .hospitals-chart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .specialty-bar {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .specialty-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .specialty-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .specialty-count {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .bar-container {
          height: 8px;
          background: #f1f5f9;
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .hospital-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .hospital-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .hospital-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hospital-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 80px;
        }

        .hospital-count {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          min-width: 20px;
          text-align: right;
        }

        .hospital-bar {
          width: 40px;
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }

        .hospital-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .no-data {
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          padding: 20px;
        }

        /* Logs Section */
        .logs-section {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .logs-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .logs-controls {
          display: flex;
          gap: 16px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group select {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 14px;
        }

        .logs-table-container {
          overflow-x: auto;
        }

        .logs-table {
          width: 100%;
          border-collapse: collapse;
        }

        .logs-table th {
          text-align: left;
          padding: 16px 20px;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .logs-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
          font-size: 14px;
        }

        .logs-table tr:hover {
          background: #f8fafc;
        }

        .timestamp-cell {
          font-family: ui-monospace, SFMono-Regular, "Courier New", monospace;
          color: #64748b;
          white-space: nowrap;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge.success {
          background: #dcfce7;
          color: #166534;
        }

        .badge.refused {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .user-id {
          background: #f1f5f9;
          color: #475569;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, "Courier New", monospace;
          font-size: 12px;
        }

        .no-user {
          color: #9ca3af;
          font-style: italic;
        }

        .message-cell {
          max-width: 300px;
          word-wrap: break-word;
        }

        .ip-cell {
          font-family: ui-monospace, SFMono-Regular, "Courier New", monospace;
          color: #64748b;
          font-size: 13px;
        }

        .user-agent-cell {
          max-width: 200px;
          color: #64748b;
          font-size: 13px;
        }

        .logs-table .no-data {
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          padding: 40px 20px;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          background: white;
          color: #374151;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-outline {
          border-color: #d1d5db;
          background: white;
        }

        .btn-outline:hover:not(:disabled) {
          border-color: #9ca3af;
          background: #f9fafb;
        }

        .btn-ghost {
          background: transparent;
          border-color: transparent;
          color: #64748b;
        }

        .btn-ghost:hover:not(:disabled) {
          background: #f1f5f9;
          color: #374151;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .sidebar {
            display: none;
          }

          .main-content {
            display: block;
          }

          .container {
            padding: 24px 16px;
          }

          .charts-section {
            grid-template-columns: 1fr;
          }

          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .event-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .event-meta {
            flex-direction: column;
            gap: 12px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .header-content {
            padding: 12px 16px;
            flex-direction: column;
            gap: 12px;
          }

          .search-input {
            width: 100%;
          }

          .event-picker {
            min-width: auto;
            width: 100%;
          }

          .logs-table-container {
            overflow-x: scroll;
          }

          .logs-table {
            min-width: 800px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminEventAnalytics;
