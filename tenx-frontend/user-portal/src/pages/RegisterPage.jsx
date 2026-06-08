import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Loader, ChevronRight } from 'lucide-react'
import { authApi, useAuthStore } from '../api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cellNo: '',
    companyName: '',
    industry: '',
    cityName: '',
  })

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { data } = await authApi.register({
        userName: form.userName,
        email: form.email,
        password: form.password,
        cellNo: form.cellNo,
        companyName: form.companyName,
        industry: form.industry,
        cityName: form.cityName,
      })

      const { accessToken, refreshToken, user } = data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      useAuthStore.setState({
        accessToken,
        refreshToken,
        user,
      })

      toast.success('Account created successfully!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" style={{ marginTop: -60, paddingTop: 60 }}>
      <div className="login-box" style={{ maxWidth: 520 }}>
        <div className="login-logo">
          Create <span style={{ color: 'var(--accent)' }}>Account</span>
        </div>
        <p className="login-sub">Register as a client to start chatting with consultants</p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Full Name</label>
            <input value={form.userName} onChange={e => setField('userName', e.target.value)} placeholder="Your full name" required autoFocus />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="you@company.com" required />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="Minimum 6 characters" minLength={6} required />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => setField('confirmPassword', e.target.value)} placeholder="Repeat password" minLength={6} required />
            </div>
          </div>

          <div className="form-group">
            <label>Phone / Cell No</label>
            <input value={form.cellNo} onChange={e => setField('cellNo', e.target.value)} placeholder="+92 300 1234567" />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Company Name</label>
              <input value={form.companyName} onChange={e => setField('companyName', e.target.value)} placeholder="Your company" />
            </div>

            <div className="form-group">
              <label>Industry</label>
              <input value={form.industry} onChange={e => setField('industry', e.target.value)} placeholder="Technology, Retail, etc." />
            </div>
          </div>

          <div className="form-group">
            <label>City</label>
            <input value={form.cityName} onChange={e => setField('cityName', e.target.value)} placeholder="Karachi" />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            {loading ? <Loader size={14} className="spin" /> : <>Create Account <ChevronRight size={14} /></>}
          </button>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
