/*
 * Wasmer/Hostinger single-process server for 10X Convo.
 *
 * Serves:
 *   /api/*        -> proxied to Next.js standalone backend
 *   /admin/*      -> Admin portal SPA build
 *   /consultant/* -> Consultant portal SPA build
 *   /*            -> User portal SPA build
 */

const fs = require('fs')
const http = require('http')
const path = require('path')
const { URL } = require('url')

const rootDir = __dirname
const apiDir = path.join(rootDir, 'tenx-api-next')

const publicPort = Number(process.env.PORT || 5000)
const hostname = process.env.HOST || '0.0.0.0'
const nextInternalPort = Number(process.env.NEXT_INTERNAL_PORT || 5055)
const nextInternalHost = '127.0.0.1'

const adminDist = path.join(rootDir, 'tenx-frontend', 'admin-portal', 'dist')
const consultantDist = path.join(rootDir, 'tenx-frontend', 'consultant-portal', 'dist')
const userDist = path.join(rootDir, 'tenx-frontend', 'user-portal', 'dist')

const prefixedPortals = {
  '/admin': adminDist,
  '/consultant': consultantDist
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
}

function exists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function findStandaloneServer() {
  const candidates = [
    path.join(apiDir, '.next', 'standalone', 'server.js'),
    path.join(apiDir, '.next', 'standalone', 'tenx-api-next', 'server.js'),
  ]

  for (const candidate of candidates) {
    if (exists(candidate)) return candidate
  }

  const standaloneRoot = path.join(apiDir, '.next', 'standalone')
  if (exists(standaloneRoot)) {
    const stack = [standaloneRoot]
    while (stack.length) {
      const dir = stack.pop()
      let entries = []
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        continue
      }

      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') stack.push(full)
        } else if (entry.isFile() && entry.name === 'server.js') {
          return full
        }
      }
    }
  }

  return null
}

function startNextStandalone() {
  const standaloneServer = findStandaloneServer()

  if (!standaloneServer) {
    console.error('Could not find Next standalone server.js')
    try {
      console.error('Standalone root:', path.join(apiDir, '.next', 'standalone'))
      console.error('Contents:', fs.readdirSync(path.join(apiDir, '.next', 'standalone')))
    } catch (e) {
      console.error('Standalone directory missing:', e.message)
    }
    process.exit(1)
  }

  console.log('Starting Next standalone backend:', standaloneServer)
  console.log(`Next internal URL: http://${nextInternalHost}:${nextInternalPort}`)

  const oldPort = process.env.PORT
  const oldHostname = process.env.HOSTNAME

  process.env.PORT = String(nextInternalPort)
  process.env.HOSTNAME = nextInternalHost
  process.env.HOST = nextInternalHost

  require(standaloneServer)

  // Restore for public server logs/logic.
  if (oldPort === undefined) delete process.env.PORT
  else process.env.PORT = oldPort

  if (oldHostname === undefined) delete process.env.HOSTNAME
  else process.env.HOSTNAME = oldHostname
}

function safeJoin(baseDir, requestPath) {
  const cleanPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(baseDir, cleanPath)
  if (!filePath.startsWith(baseDir)) return null
  return filePath
}

function sendFile(res, filePath) {
  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Content-Length', stat.size)

    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache')
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }

    fs.createReadStream(filePath).pipe(res)
  })
}

function serveSpaFromDist(res, distDir, relativePath, label) {
  if (!exists(distDir)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(`${label} portal is not built. Run npm run build first.`)
    return true
  }

  let rel = relativePath
  if (!rel || rel === '/') rel = '/index.html'

  const filePath = safeJoin(distDir, rel)
  if (filePath && exists(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath)
  } else {
    sendFile(res, path.join(distDir, 'index.html'))
  }

  return true
}

function tryServePrefixedPortal(res, pathname) {
  for (const [basePath, distDir] of Object.entries(prefixedPortals)) {
    if (pathname !== basePath && !pathname.startsWith(basePath + '/')) continue
    const relativePath = pathname.slice(basePath.length) || '/'
    return serveSpaFromDist(res, distDir, relativePath, basePath)
  }
  return false
}

function proxyToNext(req, res) {
  const headers = { ...req.headers }
  headers.host = `${nextInternalHost}:${nextInternalPort}`
  headers['x-forwarded-proto'] = headers['x-forwarded-proto'] || 'https'
  headers['x-forwarded-host'] = req.headers.host || ''

  const proxyReq = http.request({
    hostname: nextInternalHost,
    port: nextInternalPort,
    method: req.method,
    path: req.url,
    headers,
  }, proxyRes => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
    proxyRes.pipe(res)
  })

  proxyReq.on('error', err => {
    console.error('Proxy to Next backend failed:', err)
    if (!res.headersSent) {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
    }
    res.end(JSON.stringify({
      success: false,
      message: 'Backend unavailable',
      error: err.message,
    }))
  })

  req.pipe(proxyReq)
}

function main() {
  startNextStandalone()

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = decodeURIComponent(parsedUrl.pathname)

    if (pathname === '/favicon.ico') {
      res.statusCode = 204
      res.end()
      return
    }

    if (pathname === '/user' || pathname.startsWith('/user/')) {
      const stripped = pathname.replace(/^\/user/, '') || '/'
      res.statusCode = 302
      res.setHeader('Location', stripped + parsedUrl.search)
      res.end()
      return
    }

    // API and Next internals go to Next standalone backend.
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      proxyToNext(req, res)
      return
    }

    if (tryServePrefixedPortal(res, pathname)) return

    serveSpaFromDist(res, userDist, pathname, 'user')
  })

  server.listen(publicPort, hostname, () => {
    console.log(`10X Convo app running on http://${hostname}:${publicPort}`)
    console.log('User portal: /')
    console.log('Admin portal: /admin')
    console.log('Consultant portal: /consultant')
    console.log('API: /api')
  })
}

try {
  main()
} catch (err) {
  console.error('Failed to start app:', err)
  process.exit(1)
}
