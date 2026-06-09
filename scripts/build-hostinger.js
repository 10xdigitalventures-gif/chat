const { spawnSync } = require('child_process')

const defaultBuildEnv = {
  ...process.env,
  JWT_SECRET:
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'build-time-secret-minimum-32-characters',
  NEXTAUTH_SECRET:
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    'build-time-secret-minimum-32-characters',
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'file:./prod.db',
  NEXT_PUBLIC_URL:
    process.env.NEXT_PUBLIC_URL ||
    'https://new.10xdigitalventures.com',
  STRIPE_SECRET_KEY:
    process.env.STRIPE_SECRET_KEY ||
    'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET ||
    'whsec_dummy',
}

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
      ...defaultBuildEnv,
      VITE_BASE_PATH: basePath,
      VITE_API_URL: '/api',
    },
  })
}

buildPortal('admin-portal', '/admin/')
buildPortal('consultant-portal', '/consultant/')
buildPortal('user-portal', '/')

run('npm', ['--prefix', 'tenx-api-next', 'run', 'build'], {
  env: defaultBuildEnv,
})
