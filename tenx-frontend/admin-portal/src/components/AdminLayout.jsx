import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  AlertTriangle,
  Database,
  LogOut,
  Bell,
  FileText,
  Star,
  FileDigit,
  Radio,
  ShieldCheck,
  Receipt,
  ChevronRight,
  Search,
} from "lucide-react";

const nav = [
  { section: "Overview" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { section: "Users & Access" },
  { label: "Registrations", icon: Users, path: "/users" },
  { label: "Roles", icon: Shield, path: "/roles" },
  { label: "Role Permissions", icon: ShieldCheck, path: "/role-permissions" },
  { section: "Billing" },
  { label: "Invoices & Purchases", icon: Receipt, path: "/invoices" },
  { section: "Setup" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { section: "Data" },
  { label: "Data Constants", icon: Database, path: "/data" },
  { label: "Doc Movements", icon: FileDigit, path: "/doc-movements" },
  { label: "Reviews", icon: Star, path: "/reviews" },
  { section: "Notifications" },
  { label: "Templates", icon: FileText, path: "/templates" },
  { label: "Send / History", icon: Radio, path: "/notifications" },
  { section: "System" },
  { label: "Error Logs", icon: AlertTriangle, path: "/errors" },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <div className={`layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar-premium ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-logo-premium">
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--blue)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            10
          </div>
          {!collapsed && (
            <>
              10X <span className="blue">Convo</span>
              <span
                style={{
                  fontSize: 10,
                  marginLeft: 8,
                  padding: "2px 6px",
                  background: "#f1f3f5",
                  borderRadius: 4,
                  color: "#868e96",
                  fontWeight: 700,
                }}
              >
                ADMIN
              </span>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="sidebar-profile-card">
            <div className="avatar">{user?.userName?.charAt(0) || "A"}</div>
            <div className="info">
              <div className="name">{user?.userName || "Admin"}</div>
              <div className="sub">System Administrator</div>
            </div>
            <ChevronRight size={14} color="#adb5bd" />
          </div>
        )}

        {!collapsed && (
          <div className="sidebar-search-box">
            <Search className="search-icon" size={14} />
            <input placeholder="Search admin tools..." />
            <span className="kbd">⌘K</span>
          </div>
        )}

        <nav className="sidebar-nav-premium">
          {nav.map((item, i) =>
            item.section ? (
              !collapsed && (
                <div key={i} className="sidebar-section-premium">
                  {item.section}
                </div>
              )
            ) : (
              <button
                key={item.path}
                className={`sidebar-item-premium ${isActive(item.path) ? "active" : ""}`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} />
                {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              </button>
            ),
          )}

          {!collapsed && <div className="sidebar-section-premium">System</div>}
          <button
            className="sidebar-item-premium"
            onClick={handleLogout}
            style={{ color: "#fa5252" }}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && "Logout"}
          </button>
        </nav>

        {/* FIX: was a <div> with no onClick — now a real toggle button */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight
            size={14}
            style={{
              transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">
            {nav.find((n) => n.path && isActive(n.path))?.label || "Admin"}
          </span>
          <div className="topbar-right">
            <div className="avatar-btn">
              {user?.userName?.charAt(0)?.toUpperCase() || "A"}
            </div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
