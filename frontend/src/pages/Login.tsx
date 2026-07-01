import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api";
import type { AuthResponse } from "../types";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
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
          <h1>Your health, organized and always within reach</h1>
          <p>View your records, track prescriptions, book appointments, and access lab reports — all in one secure place built for you.</p>
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
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
          {error && <div className="auth-error">⚠️ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>
          <div className="auth-switch">
            Don't have an account? <a onClick={() => navigate("/register")}>Create one</a>
          </div>
        </div>
      </div>
    </div>
  );
}
