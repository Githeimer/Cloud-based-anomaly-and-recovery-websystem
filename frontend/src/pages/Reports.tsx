import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api";
import type { Report } from "../types";

const TYPES = ["Blood Test", "Imaging", "Pathology", "Radiology", "Cardiology", "Other"];
const STATUS = ["Ready", "Pending", "Reviewed"];
const empty = { title: "", type: "Blood Test", labName: "", status: "Ready", summary: "", fileUrl: "", date: "" };

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function statusBadge(s: string) {
  return s === "Ready" ? "badge-green" : s === "Pending" ? "badge-amber" : "badge-blue";
}
function typeIcon(t: string) {
  return t === "Blood Test" ? "🩸" : t === "Imaging" || t === "Radiology" ? "🩻" : t === "Cardiology" ? "❤️" : t === "Pathology" ? "🔬" : "📄";
}

export default function Reports() {
  const [items, setItems] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await apiFetch<{ reports: Report[] }>("/reports"); setItems(r.reports || []); } catch {}
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await apiFetch("/reports", { method: "POST", body: JSON.stringify(form) }); setModal(false); setForm(empty); load(); } catch {}
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!window.confirm("Delete this report?")) return;
    try { await apiFetch(`/reports/${id}`, { method: "DELETE" }); load(); } catch {}
  };

  const download = (r: Report) => {
    if (r.fileUrl) window.open(r.fileUrl, "_blank");
    else alert("No file attached to this report yet.");
  };

  const filtered = items.filter((r) => !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.type?.toLowerCase().includes(search.toLowerCase()));

  const stats = [
    { label: "Total Reports", value: items.length, icon: "📄", cls: "blue" },
    { label: "Ready", value: items.filter((i) => i.status === "Ready").length, icon: "✅", cls: "green" },
    { label: "Pending", value: items.filter((i) => i.status === "Pending").length, icon: "⏳", cls: "amber" },
    { label: "Reviewed", value: items.filter((i) => i.status === "Reviewed").length, icon: "👁", cls: "teal" },
  ];

  return (
    <Layout searchPlaceholder="Search reports...">
      <div className="page-header">
        <div>
          <h1>Lab Reports &amp; Results</h1>
          <p>{items.length} reports available</p>
        </div>
        <button className="btn-export" onClick={() => setModal(true)}>+ Add Report</button>
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

      <div className="card">
        <div className="card-header">
          <div className="inline-search">
            <span className="s-icon">🔍</span>
            <input placeholder="Search by title or type..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-filter">⚙ Filter</button>
        </div>
        <div className="table-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📄</div><h3>No reports found</h3><p>{search ? "Try a different search." : "Your lab reports will appear here."}</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Report</th><th>Type</th><th>Lab / Facility</th><th>Date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="item-icon item-icon-blue" style={{ width: 36, height: 36, fontSize: 16 }}>{typeIcon(r.type)}</div>
                        <div>
                          <div className="td-strong">{r.title}</div>
                          {r.summary && <div className="td-muted" style={{ fontSize: 12 }}>{r.summary}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="td-muted">{r.type}</td>
                    <td className="td-muted">{r.labName || "—"}</td>
                    <td className="td-muted">{fmtDate(r.date)}</td>
                    <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="View" onClick={() => download(r)}>👁</button>
                        <button className="icon-btn green" title="Download" onClick={() => download(r)}>⬇</button>
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
              <div className="modal-title">Add Lab Report</div>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="fg"><label>Report Title *</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Complete Blood Count" required /></div>
              <div className="modal-grid">
                <div className="fg"><label>Type</label><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div className="fg"><label>Lab / Facility</label><input value={form.labName} onChange={(e) => setForm((f) => ({ ...f, labName: e.target.value }))} placeholder="e.g. Star Hospital Lab" /></div>
                <div className="fg"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <div className="fg"><label>File URL (optional)</label><input value={form.fileUrl} onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))} placeholder="https://link-to-pdf" /></div>
              <div className="fg"><label>Summary</label><textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Key findings..." /></div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>{saving ? "Saving..." : "Save Report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}