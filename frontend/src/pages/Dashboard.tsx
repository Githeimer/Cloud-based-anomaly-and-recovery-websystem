import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
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
=======
import {
  LogOut, Plus, Trash2, Stethoscope,
  ClipboardList, Calendar, Pill, X,
  Activity, Shield, Bell, Search
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const Dashboard = () => {
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [description, setDescription] = useState("");
  const [prescription, setPrescription] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
>>>>>>> main
  const navigate = useNavigate();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { loadAll(); }, []);

<<<<<<< HEAD
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
=======
  const fetchRecords = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data.records);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/records`,
        { diagnosis, description, prescription, date },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDiagnosis(""); setDescription(""); setPrescription(""); setDate("");
      setShowForm(false);
      fetchRecords();
      toast.success("Record added!");
    } catch (err) {
      toast.error("Failed to add record");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/records/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecords();
      toast.success("Record deleted!");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };
>>>>>>> main

  const stats = [
    { label: "Medical Records", value: records.length, icon: "🗂", cls: "green", sub: "All time", subCls: "gray" },
    { label: "Active Prescriptions", value: activeRx.length, icon: "℞", cls: "teal", sub: `${prescriptions.length} total`, subCls: "green" },
    { label: "Upcoming Visits", value: upcoming.length, icon: "🗓", cls: "amber", sub: "Scheduled", subCls: "amber" },
    { label: "Lab Reports", value: 0, icon: "📄", cls: "blue", sub: "View all", subCls: "gray" },
  ];

  const filtered = records.filter((r: any) =>
    r.diagnosis.toLowerCase().includes(search.toLowerCase())
  );

  return (
<<<<<<< HEAD
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
=======
    <div className="min-h-screen bg-slate-50 flex">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col min-h-screen fixed">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800">HealthCloud</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-4 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Main Menu
          </p>
          {[
            { icon: Activity, label: "Dashboard", active: true },
            { icon: ClipboardList, label: "Records" },
            { icon: Pill, label: "Prescriptions" },
            { icon: Calendar, label: "Appointments" },
            { icon: Shield, label: "Security" },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Good morning, {user.name}! 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50">
              <Bell className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Record
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Records", value: records.length, icon: ClipboardList, color: "indigo" },
            { label: "Prescriptions", value: records.filter((r: any) => r.prescription).length, icon: Pill, color: "purple" },
            { label: "This Month", value: records.filter((r: any) => new Date(r.created_at).getMonth() === new Date().getMonth()).length, icon: Calendar, color: "blue" },
            { label: "Sensitive", value: records.filter((r: any) => r.is_sensitive).length, icon: Shield, color: "green" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-slate-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Add Record Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-800 text-lg">New Medical Record</h2>
                <button onClick={() => setShowForm(false)}>
                  <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Diagnosis *</label>
                  <input
                    placeholder="e.g. Type 2 Diabetes"
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
                  <textarea
                    placeholder="Symptoms, notes, observations..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Prescription</label>
                    <input
                      placeholder="Medicine or treatment"
                      value={prescription}
                      onChange={e => setPrescription(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Date *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Save Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Medical Records</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Search records..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-600">No records found</p>
              <p className="text-slate-400 text-sm mt-1">Add your first medical record to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Diagnosis</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Prescription</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((record: any) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Stethoscope className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{record.diagnosis}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-sm max-w-xs truncate">{record.description || "—"}</td>
                    <td className="px-5 py-4">
                      {record.prescription ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                          <Pill className="w-3 h-3" />
                          {record.prescription}
                        </span>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-sm">
                      {new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};
>>>>>>> main

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