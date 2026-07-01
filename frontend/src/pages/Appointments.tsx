import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api";
import type { Appointment } from "../types";

const TYPES = ["Consultation", "Follow-up", "Lab test", "Imaging", "Vaccination", "Surgery", "Emergency"];
const STATUS = ["Scheduled", "Completed", "Cancelled", "No-show"];
const empty = { doctorName: "", specialty: "", type: "Consultation", date: "", time: "", location: "", status: "Scheduled", notes: "" };

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}
function statusBadge(s: string) {
  return s === "Scheduled" ? "badge-blue" : s === "Completed" ? "badge-green" : s === "Cancelled" ? "badge-red" : "badge-gray";
}

export default function Appointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const a = await apiFetch<{ appointments: Appointment[] }>("/appointments"); setItems(a.appointments || []); } catch {}
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await apiFetch("/appointments", { method: "POST", body: JSON.stringify(form) }); setModal(false); setForm(empty); load(); } catch {}
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try { await apiFetch(`/appointments/${id}`, { method: "DELETE" }); load(); } catch {}
  };

  const upcoming = items.filter((i) => i.status === "Scheduled");
  const past = items.filter((i) => i.status !== "Scheduled");

  const Card = ({ a }: { a: Appointment }) => (
    <div className="item-card">
      <div className="item-card-top">
        <div style={{ display: "flex", gap: 12 }}>
          <div className="item-icon item-icon-blue">🩺</div>
          <div>
            <div className="item-title">{a.doctorName}</div>
            <div className="item-sub">{a.specialty || a.type}</div>
          </div>
        </div>
        <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
      </div>
      <span className="badge badge-gray">{a.type}</span>
      {a.date && <div className="item-row"><span className="item-row-icon">📅</span>{fmtDate(a.date)}</div>}
      {a.time && <div className="item-row"><span className="item-row-icon">🕐</span>{a.time}</div>}
      {a.location && <div className="item-row"><span className="item-row-icon">📍</span>{a.location}</div>}
      {a.notes && <div className="item-note">{a.notes}</div>}
      <button className="icon-btn danger" style={{ marginTop: 10 }} onClick={() => del(a.id)}>🗑 Remove</button>
    </div>
  );

  const stats = [
    { label: "Upcoming", value: upcoming.length, icon: "🗓", cls: "blue" },
    { label: "Completed", value: items.filter((i) => i.status === "Completed").length, icon: "✅", cls: "green" },
    { label: "Cancelled", value: items.filter((i) => i.status === "Cancelled").length, icon: "❌", cls: "red" },
    { label: "Total", value: items.length, icon: "📊", cls: "teal" },
  ];

  return (
    <Layout searchPlaceholder="Search appointments...">
      <div className="page-header">
        <div>
          <h1>Appointments</h1>
          <p>{upcoming.length} upcoming scheduled</p>
        </div>
        <button className="btn-export" onClick={() => setModal(true)}>+ Book Appointment</button>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon stat-icon-${s.cls}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🗓</div><h3>No appointments yet</h3><p>Book your first appointment to get started.</p></div></div>
      ) : (
        <>
          {upcoming.length > 0 && <><div className="section-label">Upcoming</div><div className="grid-3" style={{ marginBottom: 28 }}>{upcoming.map((a) => <Card key={a.id} a={a} />)}</div></>}
          {past.length > 0 && <><div className="section-label">Past Appointments</div><div className="grid-3">{past.map((a) => <Card key={a.id} a={a} />)}</div></>}
        </>
      )}

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Book Appointment</div>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-grid">
                <div className="fg"><label>Doctor's Name *</label><input value={form.doctorName} onChange={(e) => setForm((f) => ({ ...f, doctorName: e.target.value }))} placeholder="Dr. Smith" required /></div>
                <div className="fg"><label>Specialty</label><input value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Cardiology" /></div>
                <div className="fg"><label>Type</label><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div className="fg"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
                <div className="fg"><label>Time</label><input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
              </div>
              <div className="fg"><label>Location / Clinic</label><input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Bir Hospital, Room 204" /></div>
              <div className="fg"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Reason for visit..." /></div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>{saving ? "Booking..." : "Book Appointment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}