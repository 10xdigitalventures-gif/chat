import {
  ReviewsPage,
  ConsultantAvailabilityPage,
  UserNotificationsPage,
  ForgotPasswordPage,
} from "./pages/PartBPages";
import { ConsultantDirectPage } from "./pages/ConsultantDirectPage";
import BillingPage from "./pages/BillingPage";
import RegisterPage from "./pages/RegisterPage";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  Outlet,
} from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { createChatConnection } from "./socket";
import { userApi, useAuthStore, creditsApi } from "./api";
import {
  Search,
  MessageSquare,
  User,
  LogOut,
  Send,
  ChevronRight,
  Loader,
  Check,
  CheckCheck,
  X,
  Star,
  CreditCard,
  Paperclip,
  Mic,
  Video,
  Play,
  Square,
  FileText,
  Image as ImageIcon,
  Reply,
  LayoutDashboard,
  Calendar,
  Bell,
  Filter,
  Clock,
  Phone,
  Info,
  MoreVertical,
  Trash2,
  Users,
} from "lucide-react";

/* â”€â”€ User Sidebar & Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const userNav = [
  { section: "Dashboard" },
  { label: "Marketplace", icon: LayoutDashboard, path: "/" },
  { label: "Messages", icon: MessageSquare, path: "/messages" },
  { section: "Account" },
  { label: "My Profile", icon: User, path: "/profile" },
  { label: "Billing & Wallet", icon: CreditCard, path: "/billing" },
];

function UserLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    return path !== "/" && location.pathname.startsWith(path);
  };

  const isCrm = location.pathname.startsWith("/messages");

  return (
    <div
      className={`layout ${isCrm ? "crm-ui" : ""}`}
      style={{ background: isCrm ? "#fff" : "var(--bg)" }}
    >
      <aside className="sidebar-premium">
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
            }}
          >
            10
          </div>
          10X <span className="blue">Convo</span>
        </div>

        <div className="sidebar-profile-card">
          <div className="avatar">{user?.userName?.charAt(0) || "U"}</div>
          <div className="info">
            <div className="name">{user?.userName || "User"}</div>
            <div className="sub">Client Workspace</div>
          </div>
          <ChevronRight size={14} color="#adb5bd" />
        </div>

        <div className="sidebar-search-box">
          <Search className="search-icon" size={14} />
          <input placeholder="Search consultants..." />
          <span className="kbd">âŒ˜K</span>
        </div>

        <nav className="sidebar-nav-premium">
          {userNav.map((item, i) =>
            item.section ? (
              <div key={i} className="sidebar-section-premium">
                {item.section}
              </div>
            ) : (
              <button
                key={item.path}
                className={`sidebar-item-premium ${isActive(item.path) ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.label === "Messages" && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--blue)",
                    }}
                  />
                )}
              </button>
            ),
          )}

          <div className="sidebar-section-premium">System</div>
          <button
            className="sidebar-item-premium"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            style={{ color: "#fa5252" }}
          >
            <LogOut size={18} /> Logout
          </button>
        </nav>

        <div className="sidebar-collapse-btn">
          <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
        </div>
      </aside>

      <div className="main">
        {!isCrm && location.pathname !== "/" && (
          <header className="topbar">
            <span className="topbar-title">
              {userNav.find((n) => n.path && isActive(n.path))?.label ||
                "Account"}
            </span>
            <div className="topbar-right">
              <button
                className="icon-btn"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Bell size={18} />
              </button>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: "var(--bg3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {user?.userName?.charAt(0) || "U"}
              </div>
            </div>
          </header>
        )}
        <main
          className="page"
          style={{
            padding: isCrm ? 0 : 20,
            maxWidth: isCrm ? "none" : "1200px",
            margin: isCrm ? 0 : "0 auto",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HOME â€” Consultant Directory
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HomePage() {
  const [consultants, setConsultants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userApi.getConsultants(page, 12, query);
      const payload = data.data;
      const items = Array.isArray(payload) ? payload : payload?.items || [];
      const totalCount =
        data.total ?? payload?.totalRecords ?? payload?.total ?? items.length;
      setConsultants(items);
      setTotal(totalCount);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConnect = async (consultantId, e) => {
    e.stopPropagation();
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    setConnecting(consultantId);
    try {
      const { data } = await userApi.startChat(consultantId);
      const conversationId = data.data.conversationId;
      toast.success("Starting chat...");
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start chat");
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        {/* â”€â”€ HERO â”€â”€ */}
        <div className="hero">
          <h1>
            Find Expert <span>Consultants</span>
            <br />
            for Your Business
          </h1>
          <p>
            Connect with verified professionals across strategy, finance,
            marketing, tech and more.
          </p>
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Search by name, specializationâ€¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
            />
            <button className="search-btn" onClick={() => setQuery(search)}>
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* â”€â”€ STATS â”€â”€ */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 40,
            marginBottom: 40,
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          <span>
            <strong
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-head)",
                fontSize: 20,
              }}
            >
              {total}
            </strong>{" "}
            Consultants
          </span>
          <span>
            <strong
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-head)",
                fontSize: 20,
              }}
            >
              3
            </strong>{" "}
            Portals
          </span>
          <span>
            <strong
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-head)",
                fontSize: 20,
              }}
            >
              âˆž
            </strong>{" "}
            Possibilities
          </span>
        </div>

        {/* â”€â”€ GRID â”€â”€ */}
        {loading ? (
          <div
            style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}
          >
            <Loader size={24} className="spin" style={{ margin: "0 auto" }} />
          </div>
        ) : consultants.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}
          >
            No consultants found for "{query}"
          </div>
        ) : (
          <div className="consultant-grid">
            {consultants.map((c) => (
              <div
                key={c.userId}
                className="consultant-card"
                onClick={() => setSelected(c)}
              >
                <div className="card-avatar-wrap">
                  <div className="card-avatar">
                    {c.userName?.charAt(0)?.toUpperCase()}
                  </div>
                  {c.isOnline ? (
                    <span className="online-ring" />
                  ) : (
                    <span className="offline-ring" />
                  )}
                </div>
                <div className="card-name">{c.userName}</div>
                <div className="card-spec">
                  {c.specialization || "Consultant"}
                </div>
                <div className="card-bio">
                  {c.bio || "Expert consultant available for consultation."}
                </div>
                {c.experience && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 10,
                    }}
                  >
                    ðŸ“… {c.experience}
                  </div>
                )}
                <div className="card-meta">
                  <div className="card-rate">
                    {c.hourlyRate ? (
                      <>
                        PKR {Number(c.hourlyRate).toLocaleString()}{" "}
                        <span>/hr</span>
                      </>
                    ) : (
                      <span>Rate on request</span>
                    )}
                  </div>
                  {c.connectionStatus === "accepted" ? (
                    <button
                      className="connect-btn connected"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/messages");
                      }}
                    >
                      Chat â†—
                    </button>
                  ) : c.connectionStatus === "pending" ? (
                    <button className="connect-btn pending" disabled>
                      Pendingâ€¦
                    </button>
                  ) : (
                    <button
                      className="connect-btn"
                      disabled={connecting === c.userId}
                      onClick={(e) => handleConnect(c.userId, e)}
                    >
                      {connecting === c.userId ? (
                        <Loader size={11} className="spin" />
                      ) : (
                        "Consult Now"
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* â”€â”€ PAGINATION â”€â”€ */}
        {total > 12 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 40,
            }}
          >
            {Array.from({ length: Math.ceil(total / 12) }, (_, i) => i + 1)
              .slice(0, 7)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: p === page ? "var(--accent)" : "var(--bg2)",
                    color: p === page ? "#fff" : "var(--text)",
                    cursor: "pointer",
                    fontFamily: "var(--font-head)",
                    fontWeight: 600,
                  }}
                >
                  {p}
                </button>
              ))}
          </div>
        )}
        <div style={{ height: 60 }} />
      </div>

      {/* â”€â”€ CONSULTANT DETAIL MODAL â”€â”€ */}
      {selected && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--accent), var(--accent2))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-head)",
                    fontWeight: 800,
                    fontSize: 22,
                    color: "#fff",
                  }}
                >
                  {selected.userName?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3>{selected.userName}</h3>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--accent)",
                      fontWeight: 600,
                    }}
                  >
                    {selected.specialization}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <span
                  className={`badge ${selected.isOnline ? "badge-green" : "badge-blue"}`}
                >
                  {selected.isOnline ? "ðŸŸ¢ Online" : "âš« Offline"}
                </span>
                {selected.timezone && (
                  <span className="badge badge-blue">
                    ðŸ• {selected.timezone}
                  </span>
                )}
              </div>
              {selected.bio && (
                <p
                  style={{
                    color: "var(--muted)",
                    lineHeight: 1.7,
                    marginBottom: 16,
                  }}
                >
                  {selected.bio}
                </p>
              )}
              {selected.experience && (
                <p style={{ fontSize: 13, marginBottom: 8 }}>
                  <strong>Experience:</strong> {selected.experience}
                </p>
              )}
              {selected.hourlyRate && (
                <p
                  style={{
                    fontSize: 18,
                    fontFamily: "var(--font-head)",
                    fontWeight: 800,
                    color: "var(--accent)",
                    marginBottom: 16,
                  }}
                >
                  PKR {Number(selected.hourlyRate).toLocaleString()} / hr
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
              {selected.connectionStatus === "accepted" ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelected(null);
                    navigate("/messages");
                  }}
                >
                  Open Chat â†—
                </button>
              ) : selected.connectionStatus === "pending" ? (
                <button
                  className="btn"
                  disabled
                  style={{ background: "#f59e0b", color: "#fff" }}
                >
                  Request Pendingâ€¦
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={connecting === selected.userId}
                  onClick={async (e) => {
                    await handleConnect(selected.userId, e);
                  }}
                >
                  {connecting === selected.userId ? (
                    <Loader size={14} className="spin" />
                  ) : (
                    "Start Consultation Now"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LOGIN PAGE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LoginPage() {
  const navigate = useNavigate();
  const { step2, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await step2({ email, password: pass });
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="login-page" style={{ marginTop: -60, paddingTop: 60 }}>
        <div className="login-box">
          <div className="login-logo">
            Sign <span style={{ color: "var(--accent)" }}>In</span>
          </div>
          <p className="login-sub">Enter your email and password</p>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
              <div style={{ textAlign: "right", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--accent)",
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: 12 }}
            >
              {loading ? <Loader size={14} className="spin" /> : "Sign In"}
            </button>

            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// PROFILE PAGE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi
      .getProfile()
      .then((r) => {
        setProfile(r.data.data);
        setForm(r.data.data || {});
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile(form);
      toast.success("Profile updated!");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          My Profile
        </h2>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <Loader size={13} className="spin" /> : "Save"}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 540 }}>
        {[
          ["bio", "Bio", "Tell consultants about yourselfâ€¦", "textarea"],
          ["companyName", "Company Name", "Your company"],
          ["industry", "Industry", "e.g. Retail, Tech, Healthcare"],
          ["cityName", "City", "e.g. Karachi"],
        ].map(([k, l, p, t]) => (
          <div key={k} className="form-group">
            <label>{l}</label>
            {t === "textarea" ? (
              <textarea
                rows={3}
                value={form[k] || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [k]: e.target.value }))
                }
                placeholder={p}
              />
            ) : (
              <input
                value={form[k] || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [k]: e.target.value }))
                }
                placeholder={p}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MESSAGES PAGE â€” with SignalR real-time
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MessagesPage() {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [conversations, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(paramId || null);
  const [messages, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [credits, setCredits] = useState(null);
  const [filter, setFilter] = useState("all");
  const [canCall, setCanCall] = useState({ voice: false, video: false });
  const [search, setSearch] = useState("");

  const connRef = useRef(null);
  const bottomRef = useRef(null);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadConvs = useCallback(async () => {
    try {
      const { data } = await userApi.getConversations(1, 100);
      setConvs(data.data?.items || []);
    } catch {}
  }, []);

  const loadCredits = useCallback(async () => {
    try {
      const { data } = await creditsApi.getBalance();
      setCredits(data.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadConvs();
    loadCredits();
  }, [loadConvs, loadCredits]);

  // ── Load messages when activeId changes ─────────────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    // Clear stale state for the previous conversation
    setMsgs([]);
    setPendingFile(null);
    setReplyTo(null);
    setIsTyping(false);

    userApi
      .getMessages(activeId, 1, 100)
      .then((r) => {
        setMsgs((r.data.data?.items || []).reverse());
        userApi.markAsRead(activeId).catch(() => {});
      })
      .catch(() => {});
  }, [activeId]);

  // ── Sync URL param → activeId ────────────────────────────────────────────────
  useEffect(() => {
    if (paramId && paramId !== activeId) setActiveId(paramId);
  }, [paramId]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  };

  // ── Socket — created once per accessToken, not per activeId ─────────────────
  // Joining/leaving rooms is handled separately so we don't tear down the
  // connection every time the user switches conversations.
  useEffect(() => {
    if (!accessToken) return;
    const chat = createChatConnection(accessToken);

    chat.onReceiveMessage((msg) => {
      if (msg.conversationId === activeIdRef.current) {
        setMsgs((p) => {
          // 1. Exact ID match → already have it
          const exactMatch = p.some(
            (m) => (m.messageId || m.id) === (msg.messageId || msg.id),
          );
          if (exactMatch) return p;

          // 2. Replace our own optimistic message with the real server copy
          const optimisticIdx = p.findIndex(
            (m) =>
              m._optimistic &&
              m.body === msg.body &&
              String(m.senderId).toLowerCase() ===
                String(msg.senderId).toLowerCase(),
          );
          if (optimisticIdx !== -1) {
            const next = [...p];
            next[optimisticIdx] = msg;
            return next;
          }

          // 3. Brand-new incoming message from the other person
          return [...p, msg];
        });
      }
      loadConvs();
    });

    // FIX: wire up typing indicator
    chat.onTyping?.((payload) => {
      if (payload.conversationId === activeIdRef.current) {
        setIsTyping(true);
        // Auto-clear after 3 s if no follow-up event arrives
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    chat.onStopTyping?.((payload) => {
      if (payload.conversationId === activeIdRef.current) {
        setIsTyping(false);
      }
    });

    connRef.current = chat;
    return () => {
      chat.disconnect();
      connRef.current = null;
    };
  }, [accessToken, loadConvs]);

  // FIX: join/leave the correct room whenever activeId changes, without
  // rebuilding the whole socket connection.
  useEffect(() => {
    if (!connRef.current || !activeId) return;
    connRef.current.joinConversation(activeId);
    return () => {
      connRef.current?.leaveConversation?.(activeId);
    };
  }, [activeId]);

  // ── canCall — derive from activeConv once it's available ────────────────────
  const activeConv = conversations.find((c) => c.conversationId === activeId);

  useEffect(() => {
    if (!activeConv) return;
    // FIX: removed the bogus dynamic import that never called any API.
    // Read flags directly from the conversation object (set by the server).
    setCanCall({
      voice: activeConv.voiceEnabled ?? false,
      video: activeConv.videoEnabled ?? false,
    });
  }, [activeConv]);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const send = async (explicitAttachment = null) => {
    if (!activeId) return;
    const attachmentObj = explicitAttachment || pendingFile;

    // FIX: guard order — check sending flag first, then content
    if (sending) return;
    if (!text.trim() && !attachmentObj) return;
    if (text.length > (credits?.textCharsRemaining ?? 0)) {
      toast.error("Not enough text credits");
      return;
    }

    setSending(true);
    try {
      const type = attachmentObj?.type || "text";
      const body =
        text.trim() ||
        (type === "voice"
          ? "Voice Message"
          : type === "video"
            ? "Video Message"
            : "Attachment");
      const url = attachmentObj?.url || null;
      const rId = replyTo?.messageId || replyTo?.id || null;

      // Optimistic message shown immediately regardless of send path
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        messageId: tempId,
        senderId: user?.id,
        conversationId: activeId,
        body,
        messageType: type,
        attachmentUrl: url || null,
        replyToId: rId,
        replyToBody: replyTo?.body || null,
        sentAt: new Date().toISOString(),
        isRead: false,
        _optimistic: true,
      };
      setMsgs((p) => [...p, optimisticMsg]);

      if (type === "text" && !url) {
        // Socket path — server will echo back the real message
        if (connRef.current) connRef.current.sendMessage(activeId, body);
      } else {
        // REST path — replace optimistic msg with server response
        try {
          const { data } = await userApi.sendMessage(activeId, {
            body,
            messageType: type,
            attachmentUrl: url,
            replyToId: rId,
          });
          setMsgs((p) =>
            p.map((m) => (m.messageId === tempId ? data.data : m)),
          );
        } catch (err) {
          // Remove optimistic message on failure
          setMsgs((p) => p.filter((m) => m.messageId !== tempId));
          throw err; // re-throw so outer catch shows the toast
        }
      }

      setText("");
      setPendingFile(null);
      setReplyTo(null);
      loadCredits();
      scrollToBottom();
    } catch {
      toast.error("Send failed");
    } finally {
      setSending(false);
    }
  };

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected after clearing
    e.target.value = "";
    toast.loading("Uploading...", { id: "u" });
    try {
      const { data } = await userApi.uploadChatAttachment(activeId, file);
      setPendingFile({
        url: data.data.url,
        type: file.type.startsWith("image/") ? "image" : "file",
        name: file.name,
      });
      toast.success("Ready!", { id: "u" });
    } catch {
      toast.error("Upload failed", { id: "u" });
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter((c) => {
    if (filter === "unread") return c.unreadCount > 0;
    if (filter === "recent") {
      // Show conversations with activity in the last 24 h
      const last = c.lastMessageAt ? new Date(c.lastMessageAt) : null;
      return last && Date.now() - last.getTime() < 86_400_000;
    }
    return true;
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatConvTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="crm-container">
      {/* 1. Inbox Sidebar */}
      <div className="crm-inbox-sidebar">
        <div className="crm-list-header">Inbox</div>

        {/* FIX: all sidebar items now update the filter state */}
        <div
          className={`crm-inbox-item ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          <MessageSquare size={16} /> All Messages
        </div>
        <div
          className={`crm-inbox-item ${filter === "unread" ? "active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          <Bell size={16} /> Unread
          {conversations.some((c) => c.unreadCount > 0) && (
            <span
              style={{
                marginLeft: "auto",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#ff6b6b",
              }}
            />
          )}
        </div>
        <div
          className={`crm-inbox-item ${filter === "recent" ? "active" : ""}`}
          onClick={() => setFilter("recent")}
        >
          <Clock size={16} /> Recent
        </div>
        <div
          className={`crm-inbox-item ${filter === "starred" ? "active" : ""}`}
          onClick={() => setFilter("starred")}
        >
          <Star size={16} /> Starred
        </div>
      </div>

      {/* 2. Conversation List */}
      <div className="crm-conv-list">
        <div className="crm-list-header">
          <span>Conversations</span>
          <div style={{ display: "flex", gap: 6 }}>
            <Filter size={14} />
            <MoreVertical size={14} />
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ position: "relative", backgroundColor: "#21262C" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#ffffff",
              }}
            />
            <input
              placeholder="Search clients"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ color: "#fff", paddingLeft: 30 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredConvs.map((c) => (
            <div
              key={c.conversationId}
              className={`crm-chat-item ${c.conversationId === activeId ? "active" : ""}`}
              onClick={() => {
                setActiveId(c.conversationId);
                navigate(`/messages/${c.conversationId}`);
              }}
            >
              <div className="crm-chat-item-top">
                <div className="crm-chat-item-name">{c.otherUserName}</div>
                {/* FIX: dynamic timestamp instead of hardcoded "12:45 PM" */}
                <div className="crm-chat-item-time">
                  {formatConvTime(c.lastMessageAt)}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="crm-chat-item-msg">
                  {c.lastMessage || "No messages yet"}
                </div>
                {c.unreadCount > 0 && (
                  // <span className="chat-unread">{c.unreadCount}</span>
                  <div
                    style={{
                      background: "#228be6",
                      color: "#fff",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {c.unreadCount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Chat */}
      <div className="crm-chat-main">
        {!activeId ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00000",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <MessageSquare size={64} style={{ opacity: 1 }} />
            <p style={{ fontWeight: 500 }}>
              Select a consultant to start collaborating
            </p>
          </div>
        ) : (
          <>
            <div className="crm-chat-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "#f1f3f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "var(--blue)",
                    fontSize: 18,
                  }}
                >
                  {activeConv?.otherUserName?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {activeConv?.otherUserName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div className="online-dot" /> Online
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {canCall.voice && (
                  <button
                    className="icon-btn"
                    onClick={() => toast.success("Starting voice call...")}
                  >
                    <Phone size={18} />
                  </button>
                )}
                {canCall.video && (
                  <button
                    className="icon-btn"
                    onClick={() => toast.success("Starting video call...")}
                  >
                    <Video size={18} />
                  </button>
                )}
                <button className="icon-btn">
                  <Info size={18} />
                </button>
              </div>
            </div>

            <div className="crm-chat-messages">
              {messages.map((m) => {
                const mine =
                  String(m.senderId || "").toLowerCase() ===
                  String(user?.id || "").toLowerCase();
                return (
                  <div key={m.messageId || m.id} className="crm-msg-row">
                    <div
                      className={`crm-msg-bubble ${mine ? "crm-msg-sent" : "crm-msg-recv"}`}
                    >
                      {m.replyToId && (
                        <div
                          className="reply-quote"
                          style={{
                            background: "rgba(0,0,0,0.05)",
                            color: "#495057",
                          }}
                        >
                          <strong>{m.replyToBody || "Attachment"}</strong>
                        </div>
                      )}

                      {m.messageType === "voice" && (
                        <audio
                          src={m.attachmentUrl}
                          controls
                          style={{ maxWidth: "100%", height: 32 }}
                        />
                      )}
                      {m.messageType === "video" && (
                        <video
                          src={m.attachmentUrl}
                          controls
                          style={{ maxWidth: "100%", borderRadius: 8 }}
                        />
                      )}
                      {m.messageType === "image" && (
                        <img
                          src={m.attachmentUrl}
                          alt="msg"
                          style={{
                            maxWidth: "100%",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                          onClick={() => window.open(m.attachmentUrl)}
                        />
                      )}
                      {m.messageType === "file" && (
                        <a
                          href={m.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: "inherit",
                          }}
                        >
                          <FileText size={14} />
                          {m.body || "File"}
                        </a>
                      )}
                      {(m.messageType === "text" ||
                        !m.messageType ||
                        (m.body &&
                          m.attachmentUrl &&
                          m.messageType !== "file")) && <div>{m.body}</div>}

                      <div
                        style={{
                          fontSize: 9,
                          opacity: 0.5,
                          marginTop: 4,
                          textAlign: "right",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 4,
                        }}
                      >
                        {m.sentAt
                          ? new Date(m.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                        {mine &&
                          (m.isRead ? (
                            <CheckCheck size={12} color="var(--blue)" />
                          ) : (
                            <Check size={12} />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#228be6",
                    fontStyle: "italic",
                    marginTop: 8,
                  }}
                >
                  Consultant is typing...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="crm-input-area">
              {replyTo && (
                <div
                  style={{
                    padding: 8,
                    background: "#f8f9fa",
                    borderRadius: "8px 8px 0 0",
                    display: "flex",
                    justifyContent: "space-between",
                    border: "1px solid #e6e8eb",
                    borderBottom: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--crm-accent)",
                      fontWeight: 600,
                    }}
                  >
                    Replying to message...
                  </div>
                  <X
                    size={14}
                    style={{ cursor: "pointer" }}
                    onClick={() => setReplyTo(null)}
                  />
                </div>
              )}

              {/* FIX: show pending file preview so user knows a file is attached */}
              {pendingFile && (
                <div
                  style={{
                    padding: "6px 12px",
                    background: "#f0f4ff",
                    border: "1px solid var(--crm-border)",
                    borderBottom: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "var(--blue)",
                  }}
                >
                  <span>📎 {pendingFile.name || "Attachment ready"}</span>
                  <X
                    size={14}
                    style={{ cursor: "pointer" }}
                    onClick={() => setPendingFile(null)}
                  />
                </div>
              )}

              <div className="crm-input-box">
                <textarea
                  placeholder="Type something..."
                  value={text}
                  style={{ color: "black" }}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <div className="crm-input-toolbar">
                  <div style={{ display: "flex", gap: 12 }}>
                    <Paperclip
                      size={18}
                      color="#adb5bd"
                      style={{ cursor: "pointer" }}
                      onClick={() => document.getElementById("u-file").click()}
                    />
                    <input
                      type="file"
                      id="u-file"
                      hidden
                      onChange={handleFile}
                    />
                    <Mic
                      size={18}
                      color="#adb5bd"
                      style={{ cursor: "pointer" }}
                    />
                    <ImageIcon
                      size={18}
                      color="#adb5bd"
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => send()}
                    disabled={sending}
                  >
                    {sending ? (
                      <Loader size={14} className="spin" />
                    ) : (
                      <Send size={14} />
                    )}{" "}
                    Send
                  </button>
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 11, color: "#adb5bd" }}>
                  {credits?.textCharsRemaining?.toLocaleString()} chars left
                </span>
                <span style={{ fontSize: 11, color: "#adb5bd" }}>
                  {credits?.audioMinsRemaining} audio mins
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Details Panel */}
      <div className="crm-details-panel">
        <div className="crm-list-header">Consultant Details</div>
        <div style={{ padding: 20, textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              background: "#f1f3f5",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "var(--blue)",
            }}
          >
            {activeConv?.otherUserName?.charAt(0)}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {activeConv?.otherUserName}
          </h3>
          <p style={{ fontSize: 13, color: "#1a1d20", marginBottom: 20 }}>
            Professional Consultant
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-ghost btn-sm">Profile</button>
            <button className="btn btn-ghost btn-sm">Schedule</button>
          </div>
        </div>

        <div className="crm-details-section">
          <div className="crm-details-title">Wallet &amp; Credits</div>
          <div className="crm-field">
            <label>Text Balance</label>
            <div>
              {credits?.textCharsRemaining?.toLocaleString()} Characters
            </div>
          </div>
          <div className="crm-field">
            <label>Audio Balance</label>
            <div>{credits?.audioMinsRemaining} Minutes</div>
          </div>
          <div className="crm-field">
            <label>Video Balance</label>
            <div>{credits?.videoMinsRemaining} Minutes</div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => navigate("/billing")}
          >
            Top up Balance
          </button>
        </div>

        <div className="crm-details-section">
          <div className="crm-details-title">Actions</div>
          <button className="sidebar-item-premium" style={{ fontSize: 13 }}>
            <Clock size={16} /> View History
          </button>
          <button className="sidebar-item-premium" style={{ fontSize: 13 }}>
            <Star size={16} /> Mark as Important
          </button>
          <button
            className="sidebar-item-premium"
            style={{ fontSize: 13, color: "#fa5252" }}
          >
            <Trash2 size={16} /> Delete Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// APP ROUTER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<UserLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="profile"
            element={isLoggedIn ? <ProfilePage /> : <Navigate to="/login" />}
          />
          <Route
            path="billing"
            element={isLoggedIn ? <BillingPage /> : <Navigate to="/login" />}
          />
          <Route
            path="messages"
            element={isLoggedIn ? <MessagesPage /> : <Navigate to="/login" />}
          />
          <Route
            path="messages/:id"
            element={isLoggedIn ? <MessagesPage /> : <Navigate to="/login" />}
          />
        </Route>
        <Route path="/c/:slug" element={<ConsultantDirectPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
