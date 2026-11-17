const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const files = [
  'server.js',
  'src/controllers/authController.js',
  'src/controllers/profileController.js',
  'src/controllers/businessController.js',
  'src/routes/auth.js',
  'src/routes/profile.js',
  'src/routes/businesses.js'
];
for (const relative of files) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Backend JavaScript syntax checks passed.');
