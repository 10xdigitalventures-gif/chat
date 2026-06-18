import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { Loader } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async e => {
    e.preventDefault()

    try {
      const user = await login(email, password)

      if (!String(user.role || '').toLowerCase().includes('admin')) {
        toast.error('This portal is for admins only')
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
        <div className="login-logo">10X <span style={{ color: 'var(--accent)' }}>Admin</span></div>
        <p className="login-sub">Sign in to your admin portal</p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@tenx.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
            {loading ? <Loader size={14} className="spin" /> : 'Sign In'}
          </button>
        </form>
      </div>

      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
