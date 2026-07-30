import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api";

type Row = Record<string, unknown>;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return s;
}

export default function TableViewer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTables(); }, []);

  const loadTables = async () => {
    try {
      const data = await apiFetch<{ tables: string[] }>("/tables");
      setTables(data.tables || []);
      if (data.tables && data.tables.length > 0) {
        setSelected(data.tables[0]);
        loadRows(data.tables[0]);
      }
    } catch {
      setTables([]);
    }
  };

  const loadRows = async (table: string) => {
    if (!table) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ columns: string[]; rows: Row[] }>(`/tables/${table}`);
      setColumns(data.columns || []);
      setRows(data.rows || []);
    } catch {
      setColumns([]);
      setRows([]);
    }
    setLoading(false);
  };

  const onSelect = (table: string) => {
    setSelected(table);
    setSearch("");
    loadRows(table);
  };

  const filtered = rows.filter((row) => {
    if (!search) return true;
    return Object.values(row).some((v) => formatCell(v).toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <Layout searchPlaceholder="Search tables...">
      <div className="page-header">
        <div>
          <h1>Database Tables</h1>
          <p>Browse records from the monitoring database (read-only)</p>
        </div>
        <button className="btn-export" onClick={() => loadRows(selected)}>Refresh</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-600)" }}>Table:</label>
            <select
              className="modal-select"
              style={{ width: "auto", minWidth: 200, padding: "8px 14px" }}
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
            >
              {tables.length === 0 && <option value="">No tables available</option>}
              {tables.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="badge badge-gray">{filtered.length} rows</span>
          </div>
          <div className="inline-search">
            <span className="s-icon">S</span>
            <input placeholder="Search rows..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="empty-state"><p>Loading rows...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">DB</div>
              <h3>No rows to show</h3>
              <p>{search ? "Try a different search." : "This table has no records."}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c} className={c === "id" ? "td-strong" : "td-muted"} style={{ whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {formatCell(row[c])}
                      </td>
                    ))}
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
