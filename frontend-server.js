const fs = require('fs')
const http = require('http')
const path = require('path')
const { URL } = require('url')

const rootDir = __dirname
const port = Number(process.env.PORT || 5000)
const host = process.env.HOST || '0.0.0.0'

const adminDist = path.join(rootDir, 'tenx-frontend', 'admin-portal', 'dist')
const consultantDist = path.join(rootDir, 'tenx-frontend', 'consultant-portal', 'dist')
const userDist = path.join(rootDir, 'tenx-frontend', 'user-portal', 'dist')

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
}

function safeJoin(baseDir, requestPath) {
  const cleanPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(baseDir, cleanPath)
  if (!filePath.startsWith(baseDir)) return null
  return filePath
}

function send(res, file) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.statusCode = 404
    res.end('Not found')
    return
  }

  const ext = path.extname(file).toLowerCase()
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')

  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache')
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  fs.createReadStream(file).pipe(res)
}

function serveSpa(res, dist, pathname, prefix = '') {
  if (!fs.existsSync(dist)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(`Portal not built: ${dist}`)
    return
  }

  let rel = prefix ? pathname.slice(prefix.length) : pathname
  if (!rel || rel === '/') rel = '/index.html'

  const file = safeJoin(dist, rel)

  if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
    send(res, file)
  } else {
    send(res, path.join(dist, 'index.html'))
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  if (pathname === '/favicon.ico') {
    res.statusCode = 204
    res.end()
    return
  }

  if (pathname.startsWith('/admin')) {
    serveSpa(res, adminDist, pathname, '/admin')
    return
  }

  if (pathname.startsWith('/consultant')) {
    serveSpa(res, consultantDist, pathname, '/consultant')
    return
  }

  // User portal is at root
  serveSpa(res, userDist, pathname, '')
}).listen(port, host, () => {
  console.log(`Frontend app running on http://${host}:${port}`)
  console.log('User: /')
  console.log('Admin: /admin')
  console.log('Consultant: /consultant')
})
