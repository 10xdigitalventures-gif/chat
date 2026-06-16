import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { consultantApi } from '../api'
import { createChatConnection } from '../socket'
import {
  ChevronRight, Loader, User, Users, MessageSquare,
  Send, Check, CheckCheck, X, Bell,
  Paperclip, Mic, Video, Play, Square, FileText, Image as ImageIcon,
  Reply, Search, Filter, Clock, Star, Phone, Info, MoreVertical, Trash2
} from 'lucide-react'

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOGIN PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function LoginPage() {
  const navigate = useNavigate()
  const { login, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPass] = useState('')

  const submit = async e => {
    e.preventDefault()

    try {
      const user = await login(email, password)

      if (!String(user.role || '').toLowerCase().includes('consultant')) {
        toast.error('This portal is for consultants only')
        await useAuthStore.getState().logout()
        return
      }

      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">10X <span style={{ color: 'var(--accent)' }}>Consultant</span></div>
        <p className="login-sub">Sign in to your consultant portal</p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="consultant@tenx.com" required autoFocus />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="????????" required />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
            {loading ? <Loader size={14} className="spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// DASHBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ clients: 0, pending: 0, unread: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    consultantApi.getStats()
      .then(r => setStats(r.data.data))
      .catch(() => {
        // Fallback if stats API is not yet wired in frontend api.js
        Promise.all([
          consultantApi.getClients(1, 1, ''),
          consultantApi.getRequests(),
          consultantApi.getConversations(1, 50),
        ]).then(([c, r, m]) => setStats({
          clients: c.data.data?.totalRecords || 0,
          pending: r.data.data?.length || 0,
          unread:  (m.data.data?.items || []).reduce((s, c) => s + (c.unreadCount || 0), 0),
        })).catch(() => {})
      })
  }, [])

  return (
    <>
      <div className="page-header">
        <h2>Welcome, {user?.userName?.split(' ')[0]} ðŸ‘‹</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Clients', val: stats.clients, color: 'var(--accent)',  icon: Users,         path: '/clients' },
          { label: 'Pending Requests', val: stats.pending, color: '#f7c948',  icon: Bell,  path: '/requests' },
          { label: 'Unread Messages', val: stats.unread,  color: 'var(--blue)', icon: MessageSquare, path: '/messages' },
        ].map(s => (
          <div key={s.label} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(s.path)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>{s.label}</span>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Use the sidebar to manage your profile, view clients, handle connection requests, and chat with clients in real-time.
        </p>
      </div>
    </>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PROFILE PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({})

  useEffect(() => {
    consultantApi.getProfile()
      .then(r => { setProfile(r.data.data); setForm(r.data.data || {}) })
      .catch(() => toast.error('Failed to load profile'))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await consultantApi.updateProfile(form)
      toast.success('Profile updated!')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  const F = ({ name, label, type = 'text', ...p }) => (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={form[name] || ''} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} {...p} />
    </div>
  )

  return (
    <>
      <div className="page-header">
        <h2>My Profile</h2>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <Loader size={13} className="spin" /> : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 16, fontSize: 14 }}>Basic Info</h3>
          <div className="form-group">
            <label>Bio / Tagline</label>
            <textarea rows={3} value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Strategic consulting services for..." />
          </div>
          <F name="specialization" label="Specialization" placeholder="Business Strategy, Finance..." />
          <F name="experience" label="Experience" placeholder="10+ years" />
          <F name="hourlyRate" label="Hourly Rate (PKR)" type="number" placeholder="5000" />
          <F name="timezone" label="Timezone" placeholder="PKT (UTC+5)" />
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 16, fontSize: 14 }}>Visibility & Features</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--bg3)', borderRadius: 8 }}>
              <label className="toggle">
                <input type="checkbox" checked={form.isPublic ?? true} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
                <span className="toggle-slider" />
              </label>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Public Profile</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Visible in directory</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--bg3)', borderRadius: 8 }}>
              <label className="toggle">
                <input type="checkbox" checked={form.voiceEnabled ?? false} onChange={e => setForm(f => ({ ...f, voiceEnabled: e.target.checked }))} />
                <span className="toggle-slider" />
              </label>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Voice Calling</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Allow clients to voice call you</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--bg3)', borderRadius: 8 }}>
              <label className="toggle">
                <input type="checkbox" checked={form.videoEnabled ?? false} onChange={e => setForm(f => ({ ...f, videoEnabled: e.target.checked }))} />
                <span className="toggle-slider" />
              </label>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Video Calling</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Allow clients to video call you</div>
              </div>
            </div>
          </div>

          {/* Preview card */}
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Card Preview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: '#000', position: 'relative' }}>
                C
                {form.isPublic && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--muted)', border: '2px solid var(--bg3)' }} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Your Name</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{form.specialization || 'Specialization'}</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{form.bio || 'Your bio will appear here...'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--accent)' }}>PKR {form.hourlyRate || 'â€”'}/hr</span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'var(--accent)22', color: 'var(--accent)' }}>Connect â†—</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CLIENTS PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function ClientsPage() {
  const [clients, setClients] = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const { data } = await consultantApi.getClients(page, 10, search)
      setClients(data.data?.items || []); setTotal(data.data?.totalRecords || 0)
    } catch { toast.error('Failed to load clients') }
  }, [page, search])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="page-header">
        <h2>My Clients</h2>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{total} total</span>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <input placeholder="Search clientsâ€¦" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ background: 'none', border: 'none', padding: 0, flex: 1 }} />
        </div>

        {clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No clients yet. Accept connection requests to add clients.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {clients.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, color: 'var(--blue)' }}>
                  {c.userName?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.userName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.customerEmail}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Since {new Date(c.connectedAt).toLocaleDateString()}
                </div>
                <button className="btn btn-sm" style={{ background: 'var(--accent)22', color: 'var(--accent)', border: 'none' }}
                  onClick={() => navigate(`/messages/${c.conversationId}`)}>
                  <MessageSquare size={12} /> Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REQUESTS PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(false)

  const load = async () => {
    setLoading(true)
    try { const { data } = await consultantApi.getRequests(); setRequests(data.data || []) }
    catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handle = async (id, action) => {
    try {
      if (action === 'accept') await consultantApi.acceptRequest(id)
      else await consultantApi.rejectRequest(id)
      toast.success(action === 'accept' ? 'Request accepted! Conversation started.' : 'Request rejected')
      load()
    } catch { toast.error('Failed') }
  }

  return (
    <>
      <div className="page-header">
        <h2>Connection Requests</h2>
        <span className="badge badge-blue">{requests.length} pending</span>
      </div>

      <div className="card">
        {loading && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Loadingâ€¦</p>}
        {!loading && requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
            <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No pending requests</p>
          </div>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {requests.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--blue)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: 'var(--blue)' }}>
                {r.customerName?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{r.customerName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.customerEmail}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Requested {new Date(r.requestedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" style={{ background: 'var(--accent2)22', color: 'var(--accent2)', border: 'none' }}
                  onClick={() => handle(r.id, 'reject')}><X size={13} /> Reject</button>
                <button className="btn btn-sm btn-primary" onClick={() => handle(r.id, 'accept')}>
                  <Check size={13} /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MESSAGING PAGE (CRM STYLE)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function MessagingPage() {
  const { id: paramConvId } = useParams()
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(paramConvId && paramConvId !== 'undefined' ? paramConvId : null)
  const [messages, setMessages]           = useState([])
  const [text, setText]                   = useState('')
  const [isTyping, setIsTyping]           = useState(false)
  const [sending, setSending]             = useState(false)
  const [pendingFile, setPendingFile]     = useState(null)
  const [replyTo, setReplyTo]             = useState(null)
  const [filter, setFilter]               = useState('all') // all, unread, recent
  const [search, setSearch]               = useState('')

  const connectionRef = useRef(null)
  const bottomRef     = useRef(null)
  const fileInputRef  = useRef(null)

  const activeConvData = conversations.find(c => c.conversationId === activeConv)

  // â”€â”€ Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await consultantApi.getConversations(1, 100)
      setConversations(data.data?.items || [])
    } catch {}
  }, [])

  const loadMessages = useCallback(async (convId) => {
    if (!convId || convId === 'undefined') return
    try {
      const { data } = await consultantApi.getMessages(convId, 1, 100)
      setMessages((data.data?.items || []).reverse())
      await consultantApi.markRead(convId)
      loadConversations()
    } catch {}
  }, [loadConversations])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (activeConv) loadMessages(activeConv)
  }, [activeConv, loadMessages])

  useEffect(() => {
    if (paramConvId === 'undefined') { navigate('/messages', { replace: true }); setActiveConv(null); return }
    if (paramConvId === 'undefined') { navigate('/messages', { replace: true }); setActiveConv(null); return }
    if (paramConvId && paramConvId !== activeConv) setActiveConv(paramConvId)
  }, [paramConvId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // â”€â”€ Socket.io â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!accessToken) return
    const chat = createChatConnection(accessToken)

    chat.onReceiveMessage(msg => {
      if (msg.conversationId === activeConv) {
        setMessages(p => {
          const exists = p.some(m => (m.messageId || m.id) === (msg.messageId || msg.id))
          return exists ? p : [...p, msg]
        })
        consultantApi.markRead(activeConv).catch(() => {})
      }
      loadConversations()
    })

    if (activeConv) chat.joinConversation(activeConv)
    connectionRef.current = chat

    return () => { chat.disconnect() }
  }, [accessToken, activeConv, loadConversations])

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSend = async () => {
    if (!activeConv || (!text.trim() && !pendingFile) || sending) return
    setSending(true)
    try {
      const type = pendingFile?.type || 'text'
      const body = text.trim() || (type === 'voice' ? 'Voice Message' : type === 'video' ? 'Video Message' : 'Attachment')
      const url  = pendingFile?.url || null
      const rId  = replyTo?.messageId || replyTo?.id || null

      if (type === 'text' && !url) {
        if (connectionRef.current)
          connectionRef.current.sendMessage(activeConv, body)
      } else {
        const { data } = await consultantApi.sendMessage(activeConv, { body, messageType: type, attachmentUrl: url, replyToId: rId })
        setMessages(p => [...p, data.data])
      }
      setText('')
      setPendingFile(null)
      setReplyTo(null)
    } catch {
      toast.error('Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const type = file.type.startsWith('image/') ? 'image' : 'file'
    toast.loading('Uploading...', { id: 'u' })
    try {
      const { data } = await consultantApi.uploadAttachment(activeConv, file)
      setPendingFile({ type, url: data.data.url, name: file.name, preview: type === 'image' ? URL.createObjectURL(file) : null })
      toast.success('Ready to send', { id: 'u' })
    } catch { toast.error('Upload failed', { id: 'u' }) }
  }

  const filtered = conversations.filter(c => {
    const m = c.otherUserName.toLowerCase().includes(search.toLowerCase())
    if (filter === 'unread') return m && c.unreadCount > 0
    return m
  })

  return (
    <div className="crm-container">
      <div className="crm-inbox-sidebar">
        <div style={{ padding: '24px 16px 12px' }}>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', borderRadius: '4px' }}>+ New</button>
        </div>
        <div style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>Team Inbox</div>
        <div className={`crm-inbox-item ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}><Bell size={16} /> Unread</div>
        <div className={`crm-inbox-item ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}><Users size={16} /> All</div>
        <div className="crm-inbox-item"><Clock size={16} /> Recent</div>
        <div className="crm-inbox-item"><Star size={16} /> Starred</div>
      </div>

      <div className="crm-conv-list">
        <div className="crm-list-header">Team Inbox <div style={{ display: 'flex', gap: 6 }}><Filter size={14} /><MoreVertical size={14} /></div></div>
        <div style={{ padding: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
            <input className="crm-search" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, height: 36, borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(c => (
            <div key={c.conversationId} className={`crm-chat-item ${activeConv === c.conversationId ? 'active' : ''}`} onClick={() => { setActiveConv(c.conversationId); navigate(`/messages/${c.conversationId}`) }}>
              <div className="crm-chat-item-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, overflow: 'hidden' }}>
                    {c.otherUserAvatar ? <img src={c.otherUserAvatar} alt="a" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.otherUserName.charAt(0)}
                  </div>
                  <div className="crm-chat-item-name">{c.otherUserName}</div>
                </div>
                <div className="crm-chat-item-time">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="crm-chat-item-msg">{c.lastMessage || 'Say hello!'}</div>
                {c.unreadCount > 0 && <div style={{ background: '#228be6', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{c.unreadCount}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="crm-chat-main">
        {activeConvData ? (
          <>
            <div className="crm-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden' }}>
                  {activeConvData.otherUserAvatar ? <img src={activeConvData.otherUserAvatar} alt="a" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : activeConvData.otherUserName.charAt(0)}
                </div>
                <div style={{ fontWeight: 700 }}>{activeConvData.otherUserName}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, color: '#adb5bd' }}><Phone size={18} /><Video size={18} /><Star size={18} /><Info size={18} /><Trash2 size={18} /></div>
            </div>
            <div className="crm-chat-messages">
              {messages.map(m => {
                const isMine = String(m.senderId || '').toLowerCase() === String(user?.id || '').toLowerCase()
                return (
                  <div key={m.messageId || m.id} className="crm-msg-row">
                    <div className={`crm-msg-bubble ${isMine ? 'crm-msg-sent' : 'crm-msg-recv'}`}>
                      {m.replyToId && <div className="reply-quote"><strong>{m.replyToBody || 'Attachment'}</strong></div>}
                      <div id={`msg-${m.messageId || m.id}`}>
                        {m.messageType === 'image' && <img src={m.attachmentUrl} alt="msg" style={{ maxWidth: '100%', borderRadius: 4 }} />}
                        {m.messageType === 'file' && <a href={m.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><FileText size={14} /> {m.body || 'File'}</a>}
                        {m.messageType === 'voice' && <audio src={m.attachmentUrl} controls style={{ height: 32, maxWidth: '100%' }} />}
                        {(!m.messageType || m.messageType === 'text') && <div>{m.body}</div>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4, fontSize: 10, opacity: 0.5 }}>
                        {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {isMine && (m.isRead ? <CheckCheck size={12} /> : <Check size={12} />)}
                      </div>
                      <button className="reply-btn-overlay" onClick={() => setReplyTo(m)}><Reply size={12} /></button>
                    </div>
                  </div>
                )
              })}
              {isTyping && <div style={{ fontSize: 12, color: '#228be6', marginBottom: 16 }}>Typing...</div>}
              <div ref={bottomRef} />
            </div>
            <div className="crm-input-area">
              {replyTo && <div style={{ padding: 8, background: '#f8f9fa', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', border: '1px solid #e6e8eb', borderBottom: 'none' }}><span>Replying to <b>{replyTo.body}</b></span><X size={14} onClick={() => setReplyTo(null)} /></div>}
              {pendingFile && <div style={{ padding: 8, background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', border: '1px solid #e6e8eb', borderBottom: 'none' }}><span>Attached <b>{pendingFile.name}</b></span><X size={14} onClick={() => setPendingFile(null)} /></div>}
              <div className="crm-input-box" style={{ borderRadius: replyTo || pendingFile ? '0 0 8px 8px' : '8px' }}>
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} />
                <div className="crm-input-toolbar">
                  <div style={{ display: 'flex', gap: 12, color: '#adb5bd' }}><Paperclip size={18} onClick={() => fileInputRef.current.click()} /><Mic size={18} /><ImageIcon size={18} onClick={() => fileInputRef.current.click()} /></div>
                  <button className="btn btn-primary" onClick={handleSend} disabled={sending}>{sending ? <Loader size={12} className="spin" /> : 'Send'}</button>
                </div>
                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#adb5bd' }}><MessageSquare size={64} style={{ opacity: 0.2 }} /><p>Select a conversation</p></div>
        )}
      </div>

      {activeConvData && (
        <div className="crm-details-panel">
          <div style={{ padding: 24, textAlign: 'center', borderBottom: '1px solid #e6e8eb' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 700, fontSize: 24, overflow: 'hidden' }}>
              {activeConvData.otherUserAvatar ? <img src={activeConvData.otherUserAvatar} alt="a" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : activeConvData.otherUserName.charAt(0)}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{activeConvData.otherUserName}</div>
            <div style={{ fontSize: 13, color: '#868e96', marginTop: 4 }}>Contact Details</div>
          </div>
          <div className="crm-details-section"><div className="crm-details-title">Owner</div><div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: '#f8f9fa', padding: 8, borderRadius: 4 }}><div style={{ width: 24, height: 24, borderRadius: '50%', background: '#228be6', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{user?.userName?.charAt(0)}</div>{user?.userName}</div></div>
          <div className="crm-details-section"><div className="crm-details-title">Details</div><div className="crm-field"><label>First Name</label><div>{activeConvData.otherUserName?.split(' ')[0]}</div></div><div className="crm-field"><label>Last Name</label><div>{activeConvData.otherUserName?.split(' ')[1] || '--'}</div></div><div className="crm-field"><label>Email</label><div>{activeConvData.otherUserEmail || '--'}</div></div></div>
          <div className="crm-details-section"><div className="crm-details-title">Tags</div><div style={{ color: '#adb5bd', fontSize: 12 }}>No tags yet</div></div>
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EXPORT ALL PAGES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AllPages = {
  LoginPage,
  DashboardPage,
  ProfilePage,
  ClientsPage,
  RequestsPage,
  MessagingPage
}





