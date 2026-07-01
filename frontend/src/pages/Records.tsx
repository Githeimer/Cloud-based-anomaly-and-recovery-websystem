import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api";
import type { MedicalRecord } from "../types";

const empty = { diagnosis: "", description: "", prescription: "", doctor: "", notes: "", date: "" };

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Records() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await apiFetch<{ records: MedicalRecord[] }>("/records"); setRecords(r.records || []); } catch {}
  };

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (r: MedicalRecord) => {
    setEditing(r.id);
    setForm({ diagnosis: r.diagnosis || "", description: r.description || "", prescription: r.prescription || "", doctor: r.doctor || "", notes: r.notes || "", date: r.date?.slice(0, 10) || "" });
    setModal(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await apiFetch(`/records/${editing}`, { method: "PUT", body: JSON.stringify(form) });
      else await apiFetch("/records", { method: "POST", body: JSON.stringify(form) });
      setModal(false); load();
    } catch {}
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!window.confirm("Delete this record?")) return;
    try { await apiFetch(`/records/${id}`, { method: "DELETE" }); load(); } catch {}
  };

  const filtered = records.filter((r) =>
    !search || r.diagnosis?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout searchPlaceholder="Search records...">
      <div className="page-header">
        <div>
          <h1>Medical Records</h1>
          <p>{records.length} records on file</p>
        </div>
        <button className="btn-export" onClick={openAdd}>+ Add Record</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="inline-search">
            <span className="s-icon">🔍</span>
            <input placeholder="Search by diagnosis or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-filter">⚙ Filter</button>
        </div>
        <div className="table-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗂</div>
              <h3>No records found</h3>
              <p>{search ? "Try a different search." : "Add your first medical record."}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Diagnosis</th><th>Description</th><th>Doctor</th><th>Prescription</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="td-strong">{r.diagnosis}</td>
                    <td className="td-muted" style={{ maxWidth: 220 }}>{r.description || "—"}</td>
                    <td className="td-muted">{r.doctor || "—"}</td>
                    <td>{r.prescription ? <span className="badge badge-teal">℞ {r.prescription}</span> : <span className="td-muted">—</span>}</td>
                    <td className="td-muted">{fmtDate(r.date)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn green" title="Edit" onClick={() => openEdit(r)}>✎</button>
                        <button className="icon-btn danger" title="Delete" onClick={() => del(r.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? "Edit Record" : "New Medical Record"}</div>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="fg"><label>Diagnosis *</label><input value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. Hypertension" required /></div>
              <div className="fg"><label>Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Clinical notes..." /></div>
              <div className="modal-grid">
                <div className="fg"><label>Doctor</label><input value={form.doctor} onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))} placeholder="Dr. Sharma" /></div>
                <div className="fg"><label>Prescription</label><input value={form.prescription} onChange={(e) => setForm((f) => ({ ...f, prescription: e.target.value }))} placeholder="e.g. Amlodipine 5mg" /></div>
              </div>
              <div className="fg"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="fg"><label>Additional Notes</label><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Follow-up instructions..." /></div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Save Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}