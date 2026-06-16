import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, User, Users, UserPlus, MessageSquare, Calendar, Bell, LogOut, ChevronRight, Search } from 'lucide-react'
import { NotificationBell } from '../pages/NotificationsPage'
import { notifApi } from '../api'

const nav = [
  { section: 'Overview' },
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/' },
  { section: 'Work' },
  { label: 'My Clients',    icon: Users,           path: '/clients' },
  { label: 'Messages',      icon: MessageSquare,   path: '/messages' },
  { section: 'Profile' },
  { label: 'My Profile',    icon: User,            path: '/profile' },
  { label: 'Availability',  icon: Calendar,        path: '/availability' },
  { section: 'Inbox' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
]

export default function ConsultantLayout() {
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
          <div className="avatar">{user?.userName?.charAt(0) || 'C'}</div>
          <div className="info">
            <div className="name">{user?.userName || 'Consultant'}</div>
            <div className="sub">{user?.roleName || 'Expert'} Workspace</div>
          </div>
          <ChevronRight size={14} color="#adb5bd" />
        </div>

        <div className="sidebar-search-box">
          <Search className="search-icon" size={14} />
          <input placeholder="Search everywhere..." />
          <span className="kbd">⌘K</span>
        </div>

        <nav className="sidebar-nav-premium">
          {nav.map((item, i) =>
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
        {!isCrm && (
          <header className="topbar">
            <span className="topbar-title">
              {nav.find(n => n.path && isActive(n.path))?.label || 'Consultant'}
            </span>
            <div className="topbar-right">
              <NotificationBell notifApi={notifApi} />
              <div className="avatar-btn">{user?.userName?.charAt(0)?.toUpperCase() || 'C'}</div>
            </div>
          </header>
        )}
        <main className="page" style={{ padding: isCrm ? 0 : 20 }}><Outlet /></main>
      </div>
    </div>
  )
}
