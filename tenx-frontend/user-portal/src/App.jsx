import { ReviewsPage, ConsultantAvailabilityPage, UserNotificationsPage, ForgotPasswordPage } from './pages/PartBPages'
import { ConsultantDirectPage } from './pages/ConsultantDirectPage'
import BillingPage from './pages/BillingPage'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams, Outlet } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { createChatConnection } from './socket'
import { userApi, useAuthStore, creditsApi } from './api'
import {
  Search, MessageSquare, User, LogOut, Send,
  ChevronRight, Loader, Check, CheckCheck, X, Star, CreditCard,
  Paperclip, Mic, Video, Play, Square, FileText, Image as ImageIcon,
  Reply, LayoutDashboard, Calendar, Bell, Filter, Clock, Phone, Info, MoreVertical, Trash2, Users
} from 'lucide-react'

/* â”€â”€ User Sidebar & Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const userNav = [
  { section: 'Dashboard' },
  { label: 'Marketplace',   icon: LayoutDashboard, path: '/' },
  { label: 'Messages',      icon: MessageSquare,   path: '/messages' },
  { section: 'Account' },
  { label: 'My Profile',    icon: User,            path: '/profile' },
  { label: 'Billing & Wallet', icon: CreditCard,   path: '/billing' },
]

function UserLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    return path !== '/' && location.pathname.startsWith(path)
  }

  const isCrm = location.pathname.startsWith('/messages')
  
  return (
    <div className={`layout ${isCrm ? 'crm-ui' : ''}`} style={{ background: isCrm ? '#fff' : 'var(--bg)' }}>
      <aside className="sidebar-premium">
        <div className="sidebar-logo-premium">
          <div style={{ width: 28, height: 28, background: 'var(--blue)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 900 }}>10</div>
          10X <span className="blue">Convo</span>
        </div>

        <div className="sidebar-profile-card">
          <div className="avatar">{user?.userName?.charAt(0) || 'U'}</div>
          <div className="info">
            <div className="name">{user?.userName || 'User'}</div>
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
              <div key={i} className="sidebar-section-premium">{item.section}</div>
            ) : (
              <button key={item.path}
                className={`sidebar-item-premium ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}>
                <item.icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.label === 'Messages' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)' }} />}
              </button>
            )
          )}
          
          <div className="sidebar-section-premium">System</div>
          <button className="sidebar-item-premium" onClick={async () => { await logout(); navigate('/login') }} style={{ color: '#fa5252' }}>
            <LogOut size={18} /> Logout
          </button>
        </nav>

        <div className="sidebar-collapse-btn">
          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
        </div>
      </aside>

      <div className="main">
        {(!isCrm && location.pathname !== '/') && (
          <header className="topbar">
            <span className="topbar-title">
              {userNav.find(n => n.path && isActive(n.path))?.label || 'Account'}
            </span>
            <div className="topbar-right">
              <button className="icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Bell size={18} /></button>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{user?.userName?.charAt(0) || 'U'}</div>
            </div>
          </header>
        )}
        <main className="page" style={{ padding: isCrm ? 0 : 20, maxWidth: isCrm ? 'none' : '1200px', margin: isCrm ? 0 : '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HOME â€” Consultant Directory
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HomePage() {
  const [consultants, setConsultants] = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [query, setQuery]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [connecting, setConnecting]   = useState(null)
  const { isLoggedIn } = useAuthStore()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await userApi.getConsultants(page, 12, query)
const payload = data.data
const items = Array.isArray(payload) ? payload : (payload?.items || [])
const totalCount = data.total ?? payload?.totalRecords ?? payload?.total ?? items.length
setConsultants(items)
setTotal(totalCount)
    } catch { } finally { setLoading(false) }
  }, [page, query])

  useEffect(() => { load() }, [load])

  const handleConnect = async (consultantId, e) => {
    e.stopPropagation()
    if (!isLoggedIn()) { navigate('/login'); return }
    setConnecting(consultantId)
    try {
      const { data } = await userApi.startChat(consultantId)
      const conversationId = data.data.conversationId
      toast.success('Starting chat...')
      navigate(`/messages/${conversationId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start chat')
    } finally { setConnecting(null) }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        {/* â”€â”€ HERO â”€â”€ */}
        <div className="hero">
          <h1>Find Expert <span>Consultants</span><br />for Your Business</h1>
          <p>Connect with verified professionals across strategy, finance, marketing, tech and more.</p>
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Search by name, specializationâ€¦"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setQuery(search)}
            />
            <button className="search-btn" onClick={() => setQuery(search)}>
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* â”€â”€ STATS â”€â”€ */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 40, color: 'var(--muted)', fontSize: 13 }}>
          <span><strong style={{ color: 'var(--text)', fontFamily: 'var(--font-head)', fontSize: 20 }}>{total}</strong> Consultants</span>
          <span><strong style={{ color: 'var(--text)', fontFamily: 'var(--font-head)', fontSize: 20 }}>3</strong> Portals</span>
          <span><strong style={{ color: 'var(--text)', fontFamily: 'var(--font-head)', fontSize: 20 }}>âˆž</strong> Possibilities</span>
        </div>

        {/* â”€â”€ GRID â”€â”€ */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}><Loader size={24} className="spin" style={{ margin: '0 auto' }} /></div>
        ) : consultants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>No consultants found for "{query}"</div>
        ) : (
          <div className="consultant-grid">
            {consultants.map(c => (
              <div key={c.userId} className="consultant-card" onClick={() => setSelected(c)}>
                <div className="card-avatar-wrap">
                  <div className="card-avatar">{c.userName?.charAt(0)?.toUpperCase()}</div>
                  {c.isOnline ? <span className="online-ring" /> : <span className="offline-ring" />}
                </div>
                <div className="card-name">{c.userName}</div>
                <div className="card-spec">{c.specialization || 'Consultant'}</div>
                <div className="card-bio">{c.bio || 'Expert consultant available for consultation.'}</div>
                {c.experience && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>ðŸ“… {c.experience}</div>
                )}
                <div className="card-meta">
                  <div className="card-rate">
                    {c.hourlyRate ? <>PKR {Number(c.hourlyRate).toLocaleString()} <span>/hr</span></> : <span>Rate on request</span>}
                  </div>
                  {c.connectionStatus === 'accepted' ? (
                    <button className="connect-btn connected" onClick={e => { e.stopPropagation(); navigate('/messages') }}>
                      Chat â†—
                    </button>
                  ) : c.connectionStatus === 'pending' ? (
                    <button className="connect-btn pending" disabled>Pendingâ€¦</button>
                    ) : (
                      <button
                        className="connect-btn"
                        disabled={connecting === c.userId}
                        onClick={e => handleConnect(c.userId, e)}
                      >
                        {connecting === c.userId ? <Loader size={11} className="spin" /> : 'Consult Now â†—'}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* â”€â”€ PAGINATION â”€â”€ */}
        {total > 12 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
            {Array.from({ length: Math.ceil(total / 12) }, (_, i) => i + 1).slice(0, 7).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: p === page ? 'var(--accent)' : 'var(--bg2)', color: p === page ? '#fff' : 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-head)', fontWeight: 600 }}>
                {p}
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 60 }} />
      </div>

      {/* â”€â”€ CONSULTANT DETAIL MODAL â”€â”€ */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, color: '#fff' }}>
                  {selected.userName?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3>{selected.userName}</h3>
                  <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{selected.specialization}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <span className={`badge ${selected.isOnline ? 'badge-green' : 'badge-blue'}`}>
                  {selected.isOnline ? 'ðŸŸ¢ Online' : 'âš« Offline'}
                </span>
                {selected.timezone && <span className="badge badge-blue">ðŸ• {selected.timezone}</span>}
              </div>
              {selected.bio && <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 16 }}>{selected.bio}</p>}
              {selected.experience && <p style={{ fontSize: 13, marginBottom: 8 }}><strong>Experience:</strong> {selected.experience}</p>}
              {selected.hourlyRate && (
                <p style={{ fontSize: 18, fontFamily: 'var(--font-head)', fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>
                  PKR {Number(selected.hourlyRate).toLocaleString()} / hr
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.connectionStatus === 'accepted' ? (
                <button className="btn btn-primary" onClick={() => { setSelected(null); navigate('/messages') }}>Open Chat â†—</button>
              ) : selected.connectionStatus === 'pending' ? (
                <button className="btn" disabled style={{ background: '#f59e0b', color: '#fff' }}>Request Pendingâ€¦</button>
              ) : (
                <button className="btn btn-primary" disabled={connecting === selected.userId}
                  onClick={async e => { await handleConnect(selected.userId, e); }}>
                  {connecting === selected.userId ? <Loader size={14} className="spin" /> : 'Start Consultation Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LOGIN PAGE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LoginPage() {
  const navigate = useNavigate()
  const { step1, step2, loading, step1Data } = useAuthStore()
  const [phase, setPhase] = useState(1)
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [locId, setLoc]   = useState('')
  const [fyId, setFY]     = useState('')
  const [conn, setConn]   = useState('Production')
  const [socialLoading, setSocialLoading] = useState(null)

  const doStep1 = async e => {
    e.preventDefault()
    try {
      const d = await step1(email)
      const cur = d.fiscalYears?.find(f => f.isCurrent); if (cur) setFY(cur.id)
      if (d.locations?.length === 1) setLoc(d.locations[0].id)
      setPhase(2)
    } catch (err) { toast.error(err.message) }
  }

  const doStep2 = async e => {
    e.preventDefault()
    if (!locId || !fyId) { toast.error('Select location & fiscal year'); return }
    try {
      await step2({ email, password: pass, locationId: locId, fiscalYearId: fyId, connection: conn, rememberMe: false })
      toast.success('Welcome back!'); navigate('/')
    } catch (err) { toast.error(err.message) }
  }

  // â”€â”€ Social Login (Firebase) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSocialLogin = async (providerFn, providerName) => {
    setSocialLoading(providerName)
    try {
      const { signInWithGoogle, signInWithFacebook } = await import('./firebaseAuth.js')
      const fn = providerName === 'Google' ? signInWithGoogle : signInWithFacebook
      const claims = await fn()
      const { data } = await (await import('./api.js')).authApi.externalLogin(claims)
      const { accessToken, refreshToken, user } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      useAuthStore.setState({ accessToken, refreshToken, user })
      toast.success(`Welcome, ${user.userName}!`)
      navigate('/')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Social login failed'
      if (!msg.includes('popup-closed')) toast.error(msg)
    } finally { setSocialLoading(null) }
  }

  return (
    <>
      <div className="login-page" style={{ marginTop: -60, paddingTop: 60 }}>
        <div className="login-box">
          <div className="login-logo">Sign <span style={{ color: 'var(--accent)' }}>In</span></div>
          <p className="login-sub">{phase === 1 ? 'Enter your email to continue' : `Welcome, ${step1Data?.userName}`}</p>

          {phase === 1 && (
            <form onSubmit={doStep1}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                {loading ? <Loader size={14} className="spin" /> : <>Continue <ChevronRight size={14} /></>}
              </button>

              {/* â”€â”€ Social Login Divider â”€â”€ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => handleSocialLogin(null, 'Google')} disabled={!!socialLoading}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {socialLoading === 'Google' ? <Loader size={14} className="spin" /> : <><svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.9 23.9 0 000 24c0 3.77.9 7.35 2.56 10.54l7.97-5.95z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.95C6.51 42.62 14.62 48 24 48z"/></svg> Google</>}
                </button>
                <button type="button" onClick={() => handleSocialLogin(null, 'Facebook')} disabled={!!socialLoading}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {socialLoading === 'Facebook' ? <Loader size={14} className="spin" /> : <><svg width="16" height="16" viewBox="0 0 48 48"><path fill="#1877F2" d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 11.979 8.776 21.908 20.25 23.708v-16.77h-6.094V24h6.094v-5.288c0-6.014 3.583-9.337 9.065-9.337 2.625 0 5.372.469 5.372.469v5.906h-3.026c-2.981 0-3.911 1.85-3.911 3.75V24h6.656l-1.064 6.938H27.75v16.77C39.224 45.908 48 35.978 48 24z"/></svg> Facebook</>}
                </button>
              </div>
            </form>
          )}

          {phase === 2 && (
            <form onSubmit={doStep2}>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} required autoFocus />
                <div style={{ textAlign: 'right', marginTop: 4 }}>
                  <button onClick={() => navigate('/forgot-password')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)' }}>
                    Forgot password?
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <select value={locId} onChange={e => setLoc(e.target.value)} required>
                  <option value="">Selectâ€¦</option>
                  {step1Data?.locations?.map(l => <option key={l.id} value={l.id}>{l.locationName}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Fiscal Year</label>
                  <select value={fyId} onChange={e => setFY(e.target.value)} required>
                    <option value="">Selectâ€¦</option>
                    {step1Data?.fiscalYears?.map(f => <option key={f.id} value={f.id}>{f.name}{f.isCurrent ? ' â˜…' : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Connection</label>
                  <select value={conn} onChange={e => setConn(e.target.value)}>
                    {step1Data?.connections?.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPhase(1)} style={{ flex: 1, justifyContent: 'center' }}>Back</button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center', padding: 12 }}>
                  {loading ? <Loader size={14} className="spin" /> : 'Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PROFILE PAGE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProfilePage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    userApi.getProfile().then(r => { setProfile(r.data.data); setForm(r.data.data || {}) }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try { await userApi.updateProfile(form); toast.success('Profile updated!') }
    catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  return (
    <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800 }}>My Profile</h2>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader size={13} className="spin" /> : 'Save'}
          </button>
        </div>

        <div className="card" style={{ maxWidth: 540 }}>
          {[
            ['bio',         'Bio',          'Tell consultants about yourselfâ€¦', 'textarea'],
            ['companyName', 'Company Name', 'Your company'],
            ['industry',    'Industry',     'e.g. Retail, Tech, Healthcare'],
            ['cityName',    'City',         'e.g. Karachi'],
          ].map(([k, l, p, t]) => (
            <div key={k} className="form-group">
              <label>{l}</label>
              {t === 'textarea'
                ? <textarea rows={3} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} />
                : <input value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} />
              }
            </div>
          ))}
        </div>
      </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MESSAGES PAGE â€” with SignalR real-time
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MessagesPage() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const [conversations, setConvs]   = useState([])
  const [activeId, setActiveId]     = useState(paramId || null)
  const [messages, setMsgs]         = useState([])
  const [text, setText]             = useState('')
  const [isTyping, setIsTyping]     = useState(false)
  const [sending, setSending]       = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [replyTo, setReplyTo]       = useState(null)
  const [credits, setCredits]       = useState(null)
  const [filter, setFilter]         = useState('all') // all, unread, recent
  
  const connRef  = useRef(null)
  const bottomRef = useRef(null)
  const mediaRecorder = useRef(null)
  const chunks        = useRef([])
  const activeIdRef   = useRef(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const loadConvs = useCallback(async () => {
    try { const { data } = await userApi.getConversations(1, 100); setConvs(data.data?.items || []) } catch {}
  }, [])

  const loadCredits = useCallback(async () => {
    try { const { data } = await creditsApi.getBalance(); setCredits(data.data); } catch {}
  }, [])

  useEffect(() => { loadConvs(); loadCredits(); }, [loadConvs, loadCredits])

  useEffect(() => {
    if (!activeId) return
    userApi.getMessages(activeId, 1, 100)
      .then(r => { setMsgs((r.data.data?.items || []).reverse()); userApi.markAsRead(activeId).catch(() => {}) })
      .catch(() => {})
  }, [activeId])

  useEffect(() => {
    if (paramId && paramId !== activeId) setActiveId(paramId)
  }, [paramId])

  useEffect(() => { scrollToBottom() }, [messages])
  const scrollToBottom = () => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }

  // Socket.io
  useEffect(() => {
    if (!accessToken) return
    const chat = createChatConnection(accessToken)

    chat.onReceiveMessage(msg => {
      if (msg.conversationId === activeIdRef.current) {
        setMsgs(p => {
          const exists = p.some(m => (m.messageId || m.id) === (msg.messageId || msg.id))
          return exists ? p : [...p, msg]
        })
      }
      loadConvs()
    })

    // Additional event handlers can be added here (Typing, Credits, etc.)

    if (activeId) chat.joinConversation(activeId)
    connRef.current = chat

    return () => { chat.disconnect() }
  }, [accessToken, activeId])

  const send = async (explicitAttachment = null) => {
    if (!activeId) return
    const attachmentObj = explicitAttachment || pendingFile
    if (!text.trim() && !attachmentObj && !sending) return
    if (text.length > (credits?.textCharsRemaining || 0)) return

    setSending(true)
    try {
      const type = attachmentObj?.type || 'text'
      const body = text.trim() || (type === 'voice' ? 'Voice Message' : type === 'video' ? 'Video Message' : 'Attachment')
      const url = attachmentObj?.url || null
      const rId = replyTo?.messageId || replyTo?.id || null

      if (type === 'text' && !url) {
        if (connRef.current)
          connRef.current.sendMessage(activeId, body)
      } else { 
        const { data } = await userApi.sendMessage(activeId, { body, messageType: type, attachmentUrl: url, replyToId: rId }); 
        setMsgs(p => [...p, data.data]) 
      }
      setText(''); setPendingFile(null); setReplyTo(null); loadCredits(); scrollToBottom()
    } catch { toast.error('Send failed') } finally { setSending(false) }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    toast.loading('Uploading...', { id: 'u' })
    try {
      const { data } = await userApi.uploadChatAttachment(activeId, file)
      setPendingFile({ url: data.data.url, type: file.type.startsWith('image/')?'image':'file', name: file.name })
      toast.success('Ready!', { id: 'u' })
    } catch { toast.error('Upload failed', { id: 'u' }) }
  }

  const filteredConvs = conversations.filter(c => {
    if (filter === 'unread') return c.unreadCount > 0
    return true
  })

  const activeConv = conversations.find(c => c.conversationId === activeId)
  const [canCall, setCanCall] = useState({ voice: false, video: false })

  useEffect(() => {
    if (activeConv?.consultantId) {
        // Fetch consultant config to see if calling is enabled
        import('./api').then(({ consultantConfigApi }) => {
            // Note: user-portal might not have admin api access, assuming userApi has a way or just check activeConv
            setCanCall({
                voice: activeConv.voiceEnabled ?? true,
                video: activeConv.videoEnabled ?? true
            })
        })
    }
  }, [activeConv])

  return (
    <div className="crm-container">
      {/* 1. Inbox Sidebar */}
      <div className="crm-inbox-sidebar">
        <div className="crm-list-header">Inbox</div>
        <div className="crm-inbox-item active" onClick={() => setFilter('all')}>
          <MessageSquare size={16} /> All Messages
        </div>
        <div className="crm-inbox-item" onClick={() => setFilter('unread')}>
          <Bell size={16} /> Unread
          {conversations.some(c => c.unreadCount > 0) && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#ff6b6b' }} />}
        </div>
        <div className="crm-inbox-item">
          <Clock size={16} /> Recent
        </div>
        <div className="crm-inbox-item">
          <Star size={16} /> Starred
        </div>
      </div>

      {/* 2. Conversation List */}
      <div className="crm-conv-list">
        <div className="crm-list-header">
          <span>Conversations</span>
          <Filter size={14} color="#adb5bd" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvs.map(c => (
            <div key={c.conversationId}
              className={`crm-chat-item ${c.conversationId === activeId ? 'active' : ''}`}
              onClick={() => { setActiveId(c.conversationId); navigate(`/messages/${c.conversationId}`) }}>
              <div className="crm-chat-item-top">
                <div className="crm-chat-item-name">{c.otherUserName}</div>
                <div className="crm-chat-item-time">12:45 PM</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="crm-chat-item-msg">{c.lastMessage || 'No messages yet'}</div>
                {c.unreadCount > 0 && <span className="chat-unread">{c.unreadCount}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Chat */}
      <div className="crm-chat-main">
        {!activeId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd', flexDirection: 'column', gap: 16 }}>
            <MessageSquare size={64} style={{ opacity: 0.2 }} />
            <p style={{ fontWeight: 500 }}>Select a consultant to start collaborating</p>
          </div>
        ) : (
          <>
            <div className="crm-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--blue)', fontSize: 18 }}>
                  {activeConv?.otherUserName?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{activeConv?.otherUserName}</div>
                  <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><div className="online-dot" /> Online</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {canCall.voice && <button className="icon-btn" onClick={() => toast.success('Starting voice call...')}><Phone size={18} /></button>}
                {canCall.video && <button className="icon-btn" onClick={() => toast.success('Starting video call...')}><Video size={18} /></button>}
                <button className="icon-btn"><Info size={18} /></button>
              </div>
            </div>

            <div className="crm-chat-messages">
              {messages.map(m => {
                const mine = String(m.senderId || '').toLowerCase() === String(user?.id || '').toLowerCase()
                return (
                  <div key={m.messageId || m.id} className="crm-msg-row">
                    <div className={`crm-msg-bubble ${mine ? 'crm-msg-sent' : 'crm-msg-recv'}`}>
                      {m.replyToId && (
                        <div className="reply-quote" style={{ background: 'rgba(0,0,0,0.05)', color: '#495057' }}>
                          <strong>{m.replyToBody || 'Attachment'}</strong>
                        </div>
                      )}
                      
                      {m.messageType === 'voice' && <audio src={m.attachmentUrl} controls style={{ maxWidth: '100%', height: 32 }} />}
                      {m.messageType === 'video' && <video src={m.attachmentUrl} controls style={{ maxWidth: '100%', borderRadius: 8 }} />}
                      {m.messageType === 'image' && <img src={m.attachmentUrl} alt="msg" style={{ maxWidth: '100%', borderRadius: 4, cursor: 'pointer' }} onClick={() => window.open(m.attachmentUrl)} />}
                      {m.messageType === 'file' && <a href={m.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'inherit' }}><FileText size={14} />{m.body || 'File'}</a>}
                      {((m.messageType === 'text' || !m.messageType) || (m.body && m.attachmentUrl && m.messageType !== 'file')) && <div>{m.body}</div>}
                      
                      <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {mine && (m.isRead ? <CheckCheck size={12} color="var(--blue)" /> : <Check size={12} />)}
                      </div>
                    </div>
                  </div>
                )
              })}
              {isTyping && <div style={{ fontSize: 12, color: 'var(--blue)', fontStyle: 'italic', marginTop: 8 }}>Consultant is typing...</div>}
              <div ref={bottomRef} />
            </div>

            <div className="crm-input-area">
              {replyTo && (
                <div style={{ padding: '8px 12px', background: '#f8f9fa', border: '1px solid var(--crm-border)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--crm-accent)', fontWeight: 600 }}>Replying to message...</div>
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setReplyTo(null)} />
                </div>
              )}
              <div className="crm-input-box">
                <textarea placeholder="Type something..." value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                />
                <div className="crm-input-toolbar">
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Paperclip size={18} color="#adb5bd" style={{ cursor: 'pointer' }} onClick={() => document.getElementById('u-file').click()} />
                    <input type="file" id="u-file" hidden onChange={handleFile} />
                    <Mic size={18} color="#adb5bd" style={{ cursor: 'pointer' }} />
                    <ImageIcon size={18} color="#adb5bd" style={{ cursor: 'pointer' }} />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => send()} disabled={sending}>
                    {sending ? <Loader size={14} className="spin" /> : <Send size={14} />} Send
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#adb5bd' }}>{credits?.textCharsRemaining?.toLocaleString()} chars left</span>
                <span style={{ fontSize: 11, color: '#adb5bd' }}>{credits?.audioMinsRemaining} audio mins</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Details Panel */}
      <div className="crm-details-panel">
        <div className="crm-list-header">Consultant Details</div>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 12, background: '#f1f3f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'var(--blue)' }}>
            {activeConv?.otherUserName?.charAt(0)}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{activeConv?.otherUserName}</h3>
          <p style={{ fontSize: 13, color: '#868e96', marginBottom: 20 }}>Professional Consultant</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm">Profile</button>
            <button className="btn btn-ghost btn-sm">Schedule</button>
          </div>
        </div>

        <div className="crm-details-section">
          <div className="crm-details-title">Wallet & Credits</div>
          <div className="crm-field">
            <label>Text Balance</label>
            <div>{credits?.textCharsRemaining?.toLocaleString()} Characters</div>
          </div>
          <div className="crm-field">
            <label>Audio Balance</label>
            <div>{credits?.audioMinsRemaining} Minutes</div>
          </div>
          <div className="crm-field">
            <label>Video Balance</label>
            <div>{credits?.videoMinsRemaining} Minutes</div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/billing')}>Top up Balance</button>
        </div>

        <div className="crm-details-section">
          <div className="crm-details-title">Actions</div>
          <button className="sidebar-item-premium" style={{ fontSize: 13 }}><Clock size={16} /> View History</button>
          <button className="sidebar-item-premium" style={{ fontSize: 13 }}><Star size={16} /> Mark as Important</button>
          <button className="sidebar-item-premium" style={{ fontSize: 13, color: '#fa5252' }}><Trash2 size={16} /> Delete Chat</button>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// APP ROUTER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn())

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
      }} />
      <Routes>
        <Route path="/"             element={<UserLayout />}>
          <Route index              element={<HomePage />} />
          <Route path="profile"     element={isLoggedIn ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="billing"     element={isLoggedIn ? <BillingPage /> : <Navigate to="/login" />} />
          <Route path="messages"     element={isLoggedIn ? <MessagesPage /> : <Navigate to="/login" />} />
          <Route path="messages/:id" element={isLoggedIn ? <MessagesPage /> : <Navigate to="/login" />} />
        </Route>
        <Route path="/c/:slug"      element={<ConsultantDirectPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login"        element={<LoginPage />} />
        <Route path="*"             element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}


