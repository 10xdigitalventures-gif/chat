/*
 * Wasmer/Hostinger single-process server for 10X Convo.
 *
 * Serves:
 *   /api/*        -> Next.js API backend in tenx-api-next
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

function exists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function findNextPackage(startDir, maxDepth = 6) {
  const seen = new Set()

  function walk(dir, depth) {
    if (!dir || depth > maxDepth || seen.has(dir)) return null
    seen.add(dir)

    const direct = path.join(dir, 'node_modules', 'next')
    if (exists(path.join(direct, 'package.json'))) return direct

    let entries = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return null
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name === '.git' || entry.name === 'cache') continue

      const found = walk(path.join(dir, entry.name), depth + 1)
      if (found) return found
    }

    return null
  }

  return walk(startDir, 0)
}

const nextCandidates = [
  path.join(apiDir, '.next', 'standalone', 'node_modules', 'next'),
  path.join(apiDir, '.next', 'standalone', 'tenx-api-next', 'node_modules', 'next'),
  path.join(apiDir, 'node_modules', 'next'),
  path.join(rootDir, 'node_modules', 'next'),
].filter(p => exists(path.join(p, 'package.json')))

let nextPackageDir = nextCandidates[0]

if (!nextPackageDir) {
  nextPackageDir = findNextPackage(path.join(apiDir, '.next', 'standalone'))
}

if (!nextPackageDir) {
  console.error('Could not find Next.js runtime package.')
  console.error('Checked candidates:')
  for (const p of [
    path.join(apiDir, '.next', 'standalone', 'node_modules', 'next'),
    path.join(apiDir, '.next', 'standalone', 'tenx-api-next', 'node_modules', 'next'),
    path.join(apiDir, 'node_modules', 'next'),
    path.join(rootDir, 'node_modules', 'next'),
  ]) console.error(' - ' + p)

  try {
    console.error('standalone contents:', fs.readdirSync(path.join(apiDir, '.next', 'standalone')))
  } catch (e) {
    console.error('No standalone directory:', e.message)
  }

  process.exit(1)
}

console.log('Loading Next.js from:', nextPackageDir)
const next = require(nextPackageDir)

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

    if (pathname === '/user' || pathname.startsWith('/user/')) {
      const stripped = pathname.replace(/^\/user/, '') || '/'
      res.statusCode = 302
      res.setHeader('Location', stripped + parsedUrl.search)
      res.end()
      return
    }

    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'https'
      req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'] || req.headers.host
      handle(req, res, parsedUrl)
      return
    }

    if (tryServePrefixedPortal(res, pathname)) return

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
  console.error('Failed to start app:', err)
  process.exit(1)
})
