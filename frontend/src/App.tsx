import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import Prescriptions from "./pages/Prescriptions";
import Appointments from "./pages/Appointments";
import Reports from "./pages/Reports";
import Security from "./pages/Security";
import "./index.css";

function Loading() {
  return <div className="loading-screen"><div className="spinner" /></div>;
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function Public({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/register" element={<Public><Register /></Public>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/records" element={<Protected><Records /></Protected>} />
          <Route path="/prescriptions" element={<Protected><Prescriptions /></Protected>} />
          <Route path="/appointments" element={<Protected><Appointments /></Protected>} />
          <Route path="/reports" element={<Protected><Reports /></Protected>} />
          <Route path="/security" element={<Protected><Security /></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}