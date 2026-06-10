const { spawnSync } = require('child_process')
const fs = require('fs')

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
  NEXT_PUBLIC_URL:
    process.env.NEXT_PUBLIC_URL ||
    'https://new.10xdigitalventures.com',
  STRIPE_SECRET_KEY:
    process.env.STRIPE_SECRET_KEY ||
    'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET ||
    'whsec_dummy',
  NPM_CONFIG_PRODUCTION: 'false',
  NPM_CONFIG_INCLUDE: 'dev',
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`)

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: defaultBuildEnv,
    ...options,
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function ensureExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required file: ${filePath}`)
    process.exit(1)
  }
}

function installSubapp(dir) {
  ensureExists(`${dir}/package.json`)
  run('npm', ['--prefix', dir, 'install', '--include=dev'])
}

function buildPortal(name, basePath) {
  const dir = `tenx-frontend/${name}`

  installSubapp(dir)

  run('npm', ['--prefix', dir, 'run', 'build'], {
    env: {
      ...defaultBuildEnv,
      VITE_BASE_PATH: basePath,
      VITE_API_URL: '/api',
    },
  })
}

// Install Next.js API dependencies after Wasmer copies the full repo.
installSubapp('tenx-api-next')

// Install/build frontend portals.
buildPortal('admin-portal', '/admin/')
buildPortal('consultant-portal', '/consultant/')
buildPortal('user-portal', '/')

// Generate Prisma client only. Do NOT migrate/seed during build.
// Wasmer build env may not have DATABASE_URL available.
run('npx', ['prisma', 'generate'], {
  cwd: 'tenx-api-next',
})

// Build Next.js backend.
run('npm', ['--prefix', 'tenx-api-next', 'run', 'build'])
