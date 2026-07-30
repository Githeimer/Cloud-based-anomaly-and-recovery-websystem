import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api";
import type { AuthResponse } from "../types";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: "💾", text: "Automated database backup" },
    { icon: "🧠", text: "Anomaly detection using ML" },
    { icon: "☁️", text: "AWS hosted infrastructure" },
  ];

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">✚</div>
          <span className="auth-brand-name">MediCare</span>
        </div>
        <div className="auth-hero">
          <h1>Start managing your health records today</h1>
          <p>One secure place for every diagnosis, prescription, appointment, and lab report — accessible whenever you need it.</p>
        </div>
        <div className="auth-features">
          {features.map((f) => (
            <div key={f.text} className="auth-feature">
              <div className="auth-feature-icon">{f.icon}</div>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Create an account</h2>
          <p>Fill in your details to get started</p>
          {error && <div className="auth-error">⚠️ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full name</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input className="form-input" type="text" placeholder="Your full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label>Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>
          <div className="auth-switch">
            Already have an account? <a onClick={() => navigate("/login")}>Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}