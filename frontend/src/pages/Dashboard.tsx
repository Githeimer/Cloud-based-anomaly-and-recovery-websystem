import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api";
import type { MedicalRecord, Appointment, Prescription } from "../types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function todayStr() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try { const r = await apiFetch<{ records: MedicalRecord[] }>("/records"); setRecords(r.records || []); } catch {}
    try { const a = await apiFetch<{ appointments: Appointment[] }>("/appointments"); setAppointments(a.appointments || []); } catch {}
    try { const p = await apiFetch<{ prescriptions: Prescription[] }>("/prescriptions"); setPrescriptions(p.prescriptions || []); } catch {}
  };

  const name = user?.name || user?.username || "there";
  const upcoming = appointments.filter((a) => a.status === "Scheduled");
  const activeRx = prescriptions.filter((p) => p.status === "Active");

  const filteredRecords = records.filter((r) =>
    !search || r.diagnosis?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Medical Records", value: records.length, icon: "🗂", cls: "green", sub: "All time", subCls: "gray" },
    { label: "Active Prescriptions", value: activeRx.length, icon: "℞", cls: "teal", sub: `${prescriptions.length} total`, subCls: "green" },
    { label: "Upcoming Visits", value: upcoming.length, icon: "🗓", cls: "amber", sub: "Scheduled", subCls: "amber" },
    { label: "Lab Reports", value: 0, icon: "📄", cls: "blue", sub: "View all", subCls: "gray" },
  ];

  return (
    <Layout search={search} onSearch={setSearch}>
      <div className="welcome-card">
        <div className="welcome-avatar">{name[0]?.toUpperCase()}</div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="welcome-name">{greeting()}, {name}! 👋</div>
          <div className="welcome-meta">
            <span>📅 {todayStr()}</span>
            <span>🆔 Patient ID: {String(user?.id || 1).padStart(6, "0")}</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon stat-icon-${s.cls}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-sub stat-sub-${s.subCls}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2-1">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Medical Records</div>
              <div className="card-subtitle">{filteredRecords.length} records</div>
            </div>
            <button className="btn-filter" onClick={() => navigate("/records")}>View all →</button>
          </div>
          <div className="table-wrap">
            {filteredRecords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗂</div>
                <h3>No records yet</h3>
                <p>Your medical records will appear here.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Diagnosis</th><th>Doctor</th><th>Prescription</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 6).map((r) => (
                    <tr key={r.id}>
                      <td className="td-strong">{r.diagnosis}</td>
                      <td className="td-muted">{r.doctor || "—"}</td>
                      <td>{r.prescription ? <span className="badge badge-teal">℞ {r.prescription}</span> : <span className="td-muted">—</span>}</td>
                      <td className="td-muted">{fmtDate(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Upcoming Appointments</div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: "40px 20px" }}>
                <div className="empty-icon">🗓</div>
                <p>No upcoming visits.</p>
                <button className="btn-filter" style={{ marginTop: 12 }} onClick={() => navigate("/appointments")}>Book one</button>
              </div>
            ) : (
              upcoming.slice(0, 4).map((a) => (
                <div key={a.id} className="activity-item">
                  <div className="activity-dot dot-green" />
                  <div>
                    <div className="activity-text"><strong>{a.doctorName}</strong> · {a.specialty || a.type}</div>
                    <div className="activity-time">{fmtDate(a.date)} {a.time && `at ${a.time}`}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}