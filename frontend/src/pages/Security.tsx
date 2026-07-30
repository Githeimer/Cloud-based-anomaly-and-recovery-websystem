import { useState } from "react";
import type { FormEvent } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api";

export default function Security() {
  const { user } = useAuth();
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (pw.newPw !== pw.confirm) { setErr("New passwords do not match."); return; }
    if (pw.newPw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setSaving(true);
    try {
      await apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.newPw }) });
      setMsg("Password updated successfully."); setPw({ current: "", newPw: "", confirm: "" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed to update password.");
    }
    setSaving(false);
  };

  const info = [
    { label: "Full Name", value: user?.name || user?.username || "—" },
    { label: "Email", value: user?.email || "—" },
    { label: "Account ID", value: String(user?.id || 1).padStart(8, "0") },
    { label: "Member since", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—" },
  ];

  return (
    <Layout searchPlaceholder="Search settings...">
      <div className="page-header">
        <div>
          <h1>Security &amp; Privacy</h1>
          <p>Manage your account details and password</p>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-header"><div><div className="card-title">Account Information</div><div className="card-subtitle">Your profile details</div></div></div>
            <div className="card-pad" style={{ paddingTop: 0 }}>
              {info.map((i) => <div key={i.label} className="info-row"><span className="info-label">{i.label}</span><span className="info-value">{i.value}</span></div>)}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header"><div><div className="card-title">Change Password</div><div className="card-subtitle">Update your login credentials</div></div></div>
            <div className="card-pad" style={{ paddingTop: 0 }}>
              {msg && <div className="auth-success">✅ {msg}</div>}
              {err && <div className="auth-error">⚠️ {err}</div>}
              <form onSubmit={changePw}>
                <div className="fg"><label>Current Password</label><input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} placeholder="Current password" required /></div>
                <div className="fg"><label>New Password</label><input type="password" value={pw.newPw} onChange={(e) => setPw((p) => ({ ...p, newPw: e.target.value }))} placeholder="Min. 6 characters" required /></div>
                <div className="fg"><label>Confirm New Password</label><input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" required /></div>
                <button type="submit" className="btn-submit" style={{ width: "100%" }} disabled={saving}>{saving ? "Updating..." : "Update Password"}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}