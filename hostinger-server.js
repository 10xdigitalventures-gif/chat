/*
 * Hostinger single-process server for 10X Convo.
 *
 * Serves:
 *   /api/*              -> Next.js API backend in tenx-api-next
 *   /api/socket/io      -> Next.js Socket.IO endpoint
 *   /admin/*            -> admin portal SPA build
 *   /consultant/*       -> consultant portal SPA build
 *   /user/*             -> user portal SPA build
 *   /                   -> redirects to /user/
 */

const fs = require('fs')
const http = require('http')
const path = require('path')
const { URL } = require('url')

const rootDir = __dirname
const apiDir = path.join(rootDir, 'tenx-api-next')
const next = require(path.join(apiDir, 'node_modules', 'next'))

const port = Number(process.env.PORT || 5000)
const hostname = process.env.HOST || '0.0.0.0'
const dev = process.env.NODE_ENV !== 'production' && process.env.HOSTINGER_DEV === '1'

const portals = {
  '/admin': path.join(rootDir, 'tenx-frontend', 'admin-portal', 'dist'),
  '/consultant': path.join(rootDir, 'tenx-frontend', 'consultant-portal', 'dist'),
  '/user': path.join(rootDir, 'tenx-frontend', 'user-portal', 'dist')
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

function tryServePortal(req, res, pathname) {
  for (const [basePath, distDir] of Object.entries(portals)) {
    if (pathname !== basePath && !pathname.startsWith(basePath + '/')) continue

    if (!fs.existsSync(distDir)) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(`${basePath} portal is not built. Run npm run build:hostinger first.`)
      return true
    }

    let relativePath = pathname.slice(basePath.length)
    if (!relativePath || relativePath === '/') relativePath = '/index.html'

    const normalized = path.normalize(relativePath).replace(/^\.\.{2,}(\/|\\|$)/, '')
    const filePath = path.join(distDir, normalized)

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath)
    } else {
      sendFile(res, path.join(distDir, 'index.html'))
    }
    return true
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

    if (pathname === '/favicon.ico') {
      res.statusCode = 204
      res.end()
      return
    }

    if (pathname === '/') {
      res.statusCode = 302
      res.setHeader('Location', '/user/')
      res.end()
      return
    }

    if (tryServePortal(req, res, pathname)) return

    handle(req, res, parsedUrl)
  })

  server.listen(port, hostname, () => {
    console.log(`10X Convo Hostinger app running on http://${hostname}:${port}`)
    console.log('Portals: /admin /consultant /user')
    console.log('API: /api')
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
