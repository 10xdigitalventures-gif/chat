import axios from 'axios'

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const isAuthEndpoint = (url = '') => {
  const u = String(url)
  return (
    u.includes('/auth/login') ||
    u.includes('/auth/register') ||
    u.includes('/auth/forgot-password') ||
    u.includes('/auth/verify-reset-token') ||
    u.includes('/auth/reset-password')
  )
}

export const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    cfg.headers = cfg.headers || {}
    cfg.headers.Authorization = `Bearer ${token}`
  }

  return cfg
})

let refreshPromise = null

api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config || {}

    if (
      err.response?.status === 401 &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true

      const rt = localStorage.getItem('refreshToken')

      if (!rt) {
        localStorage.clear()
        window.location.href = '/admin/login'
        return Promise.reject(err)
      }

      try {
        refreshPromise =
          refreshPromise ||
          axios.post(`${BASE}/auth/refresh`, { refreshToken: rt })

        const { data } = await refreshPromise
        refreshPromise = null

        const newAccessToken = data.data.accessToken
        const newRefreshToken = data.data.refreshToken || rt

        localStorage.setItem('accessToken', newAccessToken)
        localStorage.setItem('refreshToken', newRefreshToken)

        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newAccessToken}`

        return api(original)
      } catch (refreshError) {
        refreshPromise = null
        localStorage.clear()
        window.location.href = '/admin/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(err)
  }
)

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authApi = {
  step1: email => api.post('/auth/login/step1', { email }),
  step2: body => api.post('/auth/login/step2', body),
  refresh: token => api.post('/auth/refresh', { refreshToken: token }),
  logout: token => api.post('/auth/logout', { refreshToken: token }),
  me: () => api.get('/auth/me'),
  changePassword: body => api.put('/auth/change-password', body),

  externalLogin: body => api.post('/auth/external-login', body),
  getLinkedProviders: () => api.get('/auth/external-logins'),
  linkProvider: body => api.post('/auth/external-logins/link', body),
  unlinkProvider: prov => api.delete(`/auth/external-logins/${prov}`),
}

// ── CREDITS & PRICING (Admin) ─────────────────────────────────────────────
export const creditsApi = {
  getPricing: () => api.get('/admin/pricing'),
  updatePricing: (id, body) => api.put(`/admin/pricing/${id}`, body),
  grantCredits: body => api.post('/admin/pricing/grant-credits', body),
  confirmPayment: body => api.post('/credits/confirm-payment', body),
}

// ── CONSULTANT SERVICE CONFIG ─────────────────────────────────────────────
export const consultantConfigApi = {
  get: userId => api.get(`/admin/consultant-config/${userId}`),
  save: (userId, body) => api.put(`/admin/consultant-config/${userId}`, body),
}

// ── ADMIN INVOICES & PURCHASES ────────────────────────────────────────────
export const adminInvoiceApi = {
  list: (p, ps, s) => api.get('/admin/invoices', { params: { page: p, pageSize: ps, search: s } }),
  stats: () => api.get('/admin/invoices/stats'),
  download: id => `${BASE}/admin/invoices/${id}/download`,
  purchases: (p, ps, status, s) => api.get('/admin/invoices/purchases', { params: { page: p, pageSize: ps, status, search: s } }),
}

// ── ADMIN — SETTINGS ──────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/admin/settings'),
  updateWebsite: body => api.put('/admin/settings/website', body),
  updateBusiness: body => api.put('/admin/settings/business', body),
  updateRoles: body => api.put('/admin/settings/roles', body),
}

// ── ADMIN — ORGANIZATION ──────────────────────────────────────────────────────
export const orgApi = {
  get: () => api.get('/admin/setup/organization'),
  update: body => api.put('/admin/setup/organization', body),
  uploadLogo: fd => api.post('/admin/setup/organization/logo', fd),
}

// ── ADMIN — USERS / ROLES ─────────────────────────────────────────────────────
export const userApi = {
  getAll: (p, ps, s) => api.get('/admin/users/registrations', { params: { page: p, pageSize: ps, search: s } }),
  getById: id => api.get(`/admin/users/registrations/${id}`),
  create: body => api.post('/admin/users/registrations', body),
  update: (id, body) => api.put(`/admin/users/registrations/${id}`, body),
  delete: id => api.delete(`/admin/users/registrations/${id}`),
  resetPassword: (id, pwd) => api.put(`/admin/users/registrations/${id}/reset-password`, { newPassword: pwd }),
  uploadAvatar: (id, fd) => api.post(`/admin/users/registrations/${id}/avatar`, fd),
}

export const roleApi = {
  getAll: (p, ps, s) => api.get('/admin/users/roles', { params: { page: p, pageSize: ps, search: s } }),
  create: body => api.post('/admin/users/roles', body),
  update: (id, body) => api.put(`/admin/users/roles/${id}`, body),
  delete: id => api.delete(`/admin/users/roles/${id}`),
}

// ── ADMIN — SYSTEM ────────────────────────────────────────────────────────────
export const errorLogApi = {
  getAll: (p, ps, s) => api.get('/admin/system/error-logs', { params: { page: p, pageSize: ps, search: s } }),
  getById: id => api.get(`/admin/system/error-logs/${id}`),
  delete: id => api.delete(`/admin/system/error-logs/${id}`),
}

// Data constants kept only for existing screens still in UI
export const dataApi = {
  controlTypes: { getAll: s => api.get('/admin/data/control-types', { params: { search: s } }), create: b => api.post('/admin/data/control-types', b), update: (id,b) => api.put(`/admin/data/control-types/${id}`, b), delete: id => api.delete(`/admin/data/control-types/${id}`) },
}

export const roleModuleApi = {
  getModules: roleId => api.get(`/admin/users/roles/${roleId}/modules`),
  saveModules: (roleId, body) => api.put(`/admin/users/roles/${roleId}/modules`, body),
  menu: userId => api.get(`/admin/users/${userId}/menu`),
}

export const docMovApi = {
  getAll: s => api.get('/admin/data/document-movements', { params: { search: s } }),
  create: b => api.post('/admin/data/document-movements', b),
  update: (id,b) => api.put(`/admin/data/document-movements/${id}`, b),
  delete: id => api.delete(`/admin/data/document-movements/${id}`),
}

export const templateApi = {
  email: {
    getAll: params => api.get('/admin/notifications/templates/email', { params }),
    create: b => api.post('/admin/notifications/templates/email', b),
    update: (id,b) => api.put(`/admin/notifications/templates/email/${id}`, b),
    delete: id => api.delete(`/admin/notifications/templates/email/${id}`),
  }
}

export const notifyApi = {
  app: {
    getAll: params => api.get('/admin/notifications/app', { params }),
    create: b => api.post('/admin/notifications/app', b),
    delete: id => api.delete(`/admin/notifications/app/${id}`),
  }
}

export const reviewApi = {
  getAll: params => api.get('/admin/data/reviews', { params }),
  delete: id => api.delete(`/admin/data/reviews/${id}`),
}