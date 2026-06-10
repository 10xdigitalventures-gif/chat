const { spawnSync } = require('child_process')

const port = process.env.PORT || '5000'
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const result = spawnSync(command, ['next', 'start', '-p', port], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
})

process.exit(result.status || 0)
