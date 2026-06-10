const { spawnSync } = require('child_process')

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`)

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
    ...options,
  })

  return result.status || 0
}

function runRequired(command, args, options = {}) {
  const code = run(command, args, options)
  if (code !== 0) process.exit(code)
}

if (process.env.RUN_DB_MIGRATIONS === 'true') {
  if (!process.env.DATABASE_URL) {
    console.error('RUN_DB_MIGRATIONS=true but DATABASE_URL is missing')
    process.exit(1)
  }

  console.log('Running Prisma migrations...')
  runRequired('npx', ['prisma', 'generate'], { cwd: 'tenx-api-next' })
  runRequired('npx', ['prisma', 'migrate', 'deploy'], { cwd: 'tenx-api-next' })

  if (process.env.SEED_DB === 'true') {
    console.log('Seeding database...')
    runRequired('node', ['prisma/seed-all.cjs'], { cwd: 'tenx-api-next' })
  }
} else {
  console.log('Skipping DB migrations. Set RUN_DB_MIGRATIONS=true to enable.')
}

runRequired('node', ['hostinger-server.js'])
