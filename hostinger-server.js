/*
 * Hostinger single-process server for 10X Convo.
 *
 * Serves:
 *   /api/*              -> Next.js API backend in tenx-api-next
 *   /api/socket/io      -> Next.js Socket.IO endpoint
 *   /admin/*            -> Admin portal SPA build
 *   /consultant/*       -> Consultant portal SPA build
 *   /*                  -> User portal SPA build
 *
 * Legacy /user/* URLs are redirected to /*:
 *   /user/login    -> /login
 *   /user/register -> /register
 */

const fs = require('fs')
const http = require('http')
const path = require('path')
const Module = require('module')
const { URL } = require('url')

const rootDir = __dirname
const apiDir = path.join(rootDir, 'tenx-api-next')
let next
try {
  next = require(path.join(apiDir, '.next', 'standalone', 'node_modules', 'next'))
} catch {
  next = require(path.join(apiDir, 'node_modules', 'next'))
}

const port = Number(process.env.PORT || 5000)
const hostname = process.env.HOST || '0.0.0.0'
const dev = process.env.NODE_ENV !== 'production' && process.env.HOSTINGER_DEV === '1'

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
  if (!fs.existsSync(distDir)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(`${label} portal is not built. Run npm run build first.`)
    return true
  }

  let rel = relativePath
  if (!rel || rel === '/') rel = '/index.html'

  const filePath = safeJoin(distDir, rel)
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
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

async function main() {
  const app = next({ dev, dir: apiDir, hostname, port })
  const handle = app.getRequestHandler()
  await app.prepare()

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = decodeURIComponent(parsedUrl.pathname)

    // Stop favicon redirect loops.
    if (pathname === '/favicon.ico') {
      res.statusCode = 204
      res.end()
      return
    }

    // Backward compatibility: /user/* -> /*
    if (pathname === '/user' || pathname.startsWith('/user/')) {
      const stripped = pathname.replace(/^\/user/, '') || '/'
      res.statusCode = 302
      res.setHeader('Location', stripped + parsedUrl.search)
      res.end()
      return
    }

    // API and Next internals must be handled by Next.js only.
    // Do not redirect these routes.
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'https'
      req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'] || req.headers.host
      handle(req, res, parsedUrl)
      return
    }

    // Admin and Consultant portals stay under subpaths.
    if (tryServePrefixedPortal(res, pathname)) return

    // Everything else is User portal at root:
    // /, /login, /register, /messages, /assets/*, etc.
    serveSpaFromDist(res, userDist, pathname, 'user')
  })

  server.listen(port, hostname, () => {
    console.log(`10X Convo Hostinger app running on http://${hostname}:${port}`)
    console.log('User portal: /')
    console.log('Admin portal: /admin')
    console.log('Consultant portal: /consultant')
    console.log('API: /api')
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
