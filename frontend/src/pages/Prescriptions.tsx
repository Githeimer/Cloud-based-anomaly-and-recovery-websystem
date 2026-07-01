import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api";
import type { Prescription } from "../types";

const FREQ = ["Once daily", "Twice daily", "Three times daily", "Every 8 hours", "As needed", "Weekly"];
const STATUS = ["Active", "Completed", "On hold", "Discontinued"];
const empty = { medication: "", dosage: "", frequency: "Once daily", prescribedBy: "", startDate: "", endDate: "", status: "Active", notes: "" };

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function statusBadge(s: string) {
  return s === "Active" ? "badge-green" : s === "Completed" ? "badge-blue" : s === "On hold" ? "badge-amber" : "badge-red";
}

export default function Prescriptions() {
  const [items, setItems] = useState<Prescription[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const p = await apiFetch<{ prescriptions: Prescription[] }>("/prescriptions"); setItems(p.prescriptions || []); } catch {}
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await apiFetch("/prescriptions", { method: "POST", body: JSON.stringify(form) }); setModal(false); setForm(empty); load(); } catch {}
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!window.confirm("Remove this prescription?")) return;
    try { await apiFetch(`/prescriptions/${id}`, { method: "DELETE" }); load(); } catch {}
  };

  const active = items.filter((i) => i.status === "Active").length;
  const stats = [
    { label: "Active", value: active, icon: "✅", cls: "green" },
    { label: "Completed", value: items.filter((i) => i.status === "Completed").length, icon: "📦", cls: "blue" },
    { label: "On Hold", value: items.filter((i) => i.status === "On hold").length, icon: "⏸", cls: "amber" },
    { label: "Total", value: items.length, icon: "℞", cls: "teal" },
  ];

  return (
    <Layout searchPlaceholder="Search prescriptions...">
      <div className="page-header">
        <div>
          <h1>Prescriptions</h1>
          <p>{active} active medications</p>
        </div>
        <button className="btn-export" onClick={() => setModal(true)}>+ Add Prescription</button>
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
        <div className="card"><div className="empty-state"><div className="empty-icon">℞</div><h3>No prescriptions yet</h3><p>Add a prescription to track your medications.</p></div></div>
      ) : (
        <div className="grid-3">
          {items.map((rx) => (
            <div key={rx.id} className="item-card">
              <div className="item-card-top">
                <div style={{ display: "flex", gap: 12 }}>
                  <div className="item-icon item-icon-green">℞</div>
                  <div>
                    <div className="item-title">{rx.medication}</div>
                    <div className="item-sub">{rx.dosage || "As prescribed"}</div>
                  </div>
                </div>
                <span className={`badge ${statusBadge(rx.status)}`}>{rx.status}</span>
              </div>
              <div className="item-detail-grid">
                <div><div className="item-detail-label">Frequency</div><div className="item-detail-value">{rx.frequency || "—"}</div></div>
                <div><div className="item-detail-label">Prescribed by</div><div className="item-detail-value">{rx.prescribedBy || "—"}</div></div>
                <div><div className="item-detail-label">Start</div><div className="item-detail-value">{fmtDate(rx.startDate)}</div></div>
                <div><div className="item-detail-label">End</div><div className="item-detail-value">{rx.endDate ? fmtDate(rx.endDate) : "Ongoing"}</div></div>
              </div>
              {rx.notes && <div className="item-note">{rx.notes}</div>}
              <button className="icon-btn danger" style={{ marginTop: 10 }} onClick={() => del(rx.id)}>🗑 Remove</button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add Prescription</div>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="fg"><label>Medication Name *</label><input value={form.medication} onChange={(e) => setForm((f) => ({ ...f, medication: e.target.value }))} placeholder="e.g. Metformin" required /></div>
              <div className="modal-grid">
                <div className="fg"><label>Dosage</label><input value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" /></div>
                <div className="fg"><label>Frequency</label><select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>{FREQ.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div className="fg"><label>Prescribed By</label><input value={form.prescribedBy} onChange={(e) => setForm((f) => ({ ...f, prescribedBy: e.target.value }))} placeholder="Doctor's name" /></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div className="fg"><label>Start Date</label><input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
                <div className="fg"><label>End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div className="fg"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Instructions, side effects..." /></div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>{saving ? "Saving..." : "Save Prescription"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}