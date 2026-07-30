import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

interface LayoutProps {
  children: ReactNode;
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
}

export default function Layout({ children, search, onSearch, searchPlaceholder, actions }: LayoutProps) {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-search">
            <span className="s-icon">🔍</span>
            <input
              placeholder={searchPlaceholder || "Search records, prescriptions, appointments..."}
              value={search || ""}
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            {actions}
            <button className="notif-btn">🔔<span className="notif-dot" /></button>
            <div className="topbar-avatar">{initials}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}