const { spawnSync } = require('child_process')
const fs = require('fs')

const API_URL = process.env.VITE_API_URL || 'https://newapi.10xdigitalventures.com/api'

function run(command, args, env = {}) {
  console.log\n> ${command} ${args.join(' ')})
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...env,
    },
  })
  if (result.status !== 0) process.exit(result.status || 1)
}

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function buildPortal(dir, basePath) {
  run('npm', ['--prefix', dir, 'install', '--include=dev'])
  run('npm', ['--prefix', dir, 'run', 'build'], {
    VITE_BASE_PATH: basePath,
    VITE_API_URL: API_URL,
  })
  removeDir${dir}/node_modules)
}

buildPortal('tenx-frontend/admin-portal', '/admin/')
buildPortal('tenx-frontend/consultant-portal', '/consultant/')
buildPortal('tenx-frontend/user-portal', '/')

console.log('\n✅ Frontend build complete')
