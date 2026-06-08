const { spawnSync } = require('child_process')

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function buildPortal(name, basePath) {
  run('npm', ['--prefix', `tenx-frontend/${name}`, 'run', 'build'], {
    env: {
      ...process.env,
      VITE_BASE_PATH: basePath,
      VITE_API_URL: '/api',
    },
  })
}

buildPortal('admin-portal', '/admin/')
buildPortal('consultant-portal', '/consultant/')
buildPortal('user-portal', '/user/')

run('npm', ['--prefix', 'tenx-api-next', 'run', 'build'])
