import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface NavItem { icon: string; label: string; path: string; }

const navItems: NavItem[] = [
  { icon: "▦", label: "Dashboard", path: "/dashboard" },
  { icon: "🗂", label: "Records", path: "/records" },
  { icon: "℞", label: "Prescriptions", path: "/prescriptions" },
  { icon: "🗓", label: "Appointments", path: "/appointments" },
  { icon: "📄", label: "Reports", path: "/reports" },
  { icon: "🔒", label: "Security", path: "/security" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">✚</div>
        <span className="sidebar-brand-name">MediCare</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || user?.username || "User"}</div>
            <div className="sidebar-user-email">{user?.email || ""}</div>
          </div>
        </div>
        <button className="sidebar-signout" onClick={logout}>
          <span>⎋</span> Sign out
        </button>
      </div>
    </aside>
  );
}