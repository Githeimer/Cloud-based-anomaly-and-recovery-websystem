import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Stethoscope, Mail, Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Toaster position="top-right" />

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">HealthCloud</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your Health Records,<br />Secured & Accessible
          </h1>
          <p className="text-indigo-200 text-lg">
            Manage your medical history with enterprise-grade security and beautiful simplicity.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["256-bit Encryption", "JWT Auth", "HIPAA Ready", "Cloud Backup"].map((item) => (
            <div key={item} className="bg-white/10 rounded-lg px-4 py-3">
              <p className="text-white text-sm font-medium">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-800 text-lg">HealthCloud</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Signing in..." : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Don't have an account?{" "}
            <a href="/register" className="text-indigo-600 font-medium hover:underline">
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;