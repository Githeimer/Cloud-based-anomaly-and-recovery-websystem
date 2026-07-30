import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api";

interface AnomalyEvent {
  id: number;
  timestamp: string;
  source_ip: string;
  method: string;
  endpoint: string;
  status_code: number;
  error_code: string | null;
  response_time_ms: number;
  user_id: string | null;
  is_authenticated: boolean;
  anomaly_score: number;
  severity: string;
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function severityBadge(s: string) {
  if (s === "High") return "badge-red";
  if (s === "Medium") return "badge-amber";
  return "badge-gray";
}
function statusBadge(code: number) {
  if (code < 300) return "badge-green";
  if (code < 400) return "badge-blue";
  if (code < 500) return "badge-amber";
  return "badge-red";
}

export default function Anomalies() {
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [source, setSource] = useState<string>("");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ anomalies: AnomalyEvent[]; source: string }>("/anomalies");
      setEvents(data.anomalies || []);
      setSource(data.source || "");
    } catch {
      setEvents([]);
    }
    setLoading(false);
  };

  const high = events.filter((e) => e.severity === "High").length;
  const medium = events.filter((e) => e.severity === "Medium").length;
  const avgScore = events.length
    ? (events.reduce((s, e) => s + (e.anomaly_score || 0), 0) / events.length).toFixed(2)
    : "0.00";

  const stats = [
    { label: "Total Anomalies", value: events.length, icon: "⚠️", cls: "blue" },
    { label: "High Severity", value: high, icon: "🚨", cls: "red" },
    { label: "Medium Severity", value: medium, icon: "⚡", cls: "amber" },
    { label: "Avg. Anomaly Score", value: avgScore, icon: "📈", cls: "teal" },
  ];

  const chartData = (() => {
    if (events.length === 0) return [];
    const times = events.map((e) => new Date(e.timestamp).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = max - min || 1;
    const buckets = new Array(12).fill(0);
    for (const t of times) {
      const idx = Math.min(11, Math.floor(((t - min) / span) * 12));
      buckets[idx]++;
    }
    return buckets;
  })();
  const chartMax = Math.max(1, ...chartData);

  const filtered = events.filter((e) => {
    const matchesSearch = !search ||
      e.endpoint?.toLowerCase().includes(search.toLowerCase()) ||
      e.source_ip?.includes(search) ||
      (e.error_code || "").toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "All" || e.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <Layout searchPlaceholder="Search anomalies...">
      <div className="page-header">
        <div>
          <h1>Anomaly Detection</h1>
          <p>Suspicious activity flagged by the monitoring pipeline</p>
        </div>
        <button className="btn-export" onClick={load}>Refresh</button>
      </div>

      {source === "error" && (
        <div style={{ background: "var(--amber-light)", border: "1px solid #fde68a", color: "#b45309", padding: "10px 16px", borderRadius: "var(--radius-md)", fontSize: 13, marginBottom: 18 }}>
          The anomaly database could not be reached.
        </div>
      )}

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon stat-icon-${s.cls}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Anomalies Over Time</div>
            <div className="card-subtitle">Event volume across the recent window</div>
          </div>
        </div>
        <div style={{ padding: "24px", display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ width: "100%", padding: "20px" }}><p>No data to chart.</p></div>
          ) : (
            chartData.map((count, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 600 }}>{count || ""}</div>
                <div style={{ width: "100%", height: `${(count / chartMax) * 110}px`, minHeight: count ? 4 : 0, background: "linear-gradient(180deg, var(--green), var(--green-dark))", borderRadius: "6px 6px 0 0", transition: "height 0.3s" }} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="inline-search">
            <span className="s-icon">S</span>
            <input placeholder="Search endpoint, IP, or error code..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="modal-select" style={{ width: "auto", padding: "8px 14px" }} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state"><p>Loading anomalies...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">OK</div>
              <h3>No anomalies found</h3>
              <p>{search || severityFilter !== "All" ? "Try adjusting the filters." : "No suspicious activity detected."}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th><th>Endpoint</th><th>Source IP</th><th>Status</th><th>Error</th><th>Response</th><th>Score</th><th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="td-muted" style={{ whiteSpace: "nowrap" }}>{fmtTime(e.timestamp)}</td>
                    <td><span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-400)", marginRight: 6 }}>{e.method}</span><span className="td-strong">{e.endpoint}</span></td>
                    <td className="td-muted">{e.source_ip}</td>
                    <td><span className={`badge ${statusBadge(e.status_code)}`}>{e.status_code}</span></td>
                    <td>{e.error_code ? <span className="badge badge-gray">{e.error_code}</span> : <span className="td-muted">-</span>}</td>
                    <td className="td-muted">{e.response_time_ms} ms</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 44, height: 6, background: "var(--gray-100)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.round(e.anomaly_score * 100)}%`, height: "100%", background: e.anomaly_score > 0.7 ? "var(--red)" : e.anomaly_score > 0.4 ? "var(--amber)" : "var(--green)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-600)" }}>{e.anomaly_score?.toFixed(2)}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${severityBadge(e.severity)}`}>{e.severity}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
